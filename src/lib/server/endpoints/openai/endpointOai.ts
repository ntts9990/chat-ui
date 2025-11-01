import { z } from "zod";
import { openAICompletionToTextGenerationStream } from "./openAICompletionToTextGenerationStream";
import {
	openAIChatToTextGenerationSingle,
	openAIChatToTextGenerationStream,
} from "./openAIChatToTextGenerationStream";
import type { CompletionCreateParamsStreaming } from "openai/resources/completions";
import type {
	ChatCompletionCreateParamsNonStreaming,
	ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";
import { buildPrompt } from "$lib/buildPrompt";
import { config } from "$lib/server/config";
import type { Endpoint } from "../endpoints";
import type OpenAI from "openai";
import { createImageProcessorOptionsValidator, makeImageProcessor } from "../images";
import type { MessageFile } from "$lib/types/Message";
import type { EndpointMessage } from "../endpoints";
import { getRAGRefineTools, isRAGRefineTool, executeRAGRefineTool } from "$lib/server/ragrefine/toolHandler";
import type { ToolCall, ToolResult } from "$lib/server/ragrefine/toolHandler";
import { getRAGRefineSystemPrompt } from "$lib/ragrefine/systemPrompt";
// uuid import removed (no tool call ids)

export const endpointOAIParametersSchema = z.object({
	weight: z.number().int().positive().default(1),
	model: z.any(),
	type: z.literal("openai"),
	baseURL: z.string().url().default("https://api.openai.com/v1"),
	// Canonical auth token is OPENAI_API_KEY; keep HF_TOKEN as legacy alias
	apiKey: z.string().default(config.OPENAI_API_KEY || config.HF_TOKEN || "sk-"),
	completion: z
		.union([z.literal("completions"), z.literal("chat_completions")])
		.default("chat_completions"),
	defaultHeaders: z.record(z.string()).optional(),
	defaultQuery: z.record(z.string()).optional(),
	extraBody: z.record(z.any()).optional(),
	multimodal: z
		.object({
			image: createImageProcessorOptionsValidator({
				supportedMimeTypes: [
					// Restrict to the most widely-supported formats
					"image/png",
					"image/jpeg",
				],
				preferredMimeType: "image/jpeg",
				maxSizeInMB: 1,
				maxWidth: 1024,
				maxHeight: 1024,
			}),
		})
		.default({}),
	/* enable use of max_completion_tokens in place of max_tokens */
	useCompletionTokens: z.boolean().default(false),
	streamingSupported: z.boolean().default(true),
});

export async function endpointOai(
	input: z.input<typeof endpointOAIParametersSchema>
): Promise<Endpoint> {
	const {
		baseURL,
		apiKey,
		completion,
		model,
		defaultHeaders,
		defaultQuery,
		multimodal,
		extraBody,
		useCompletionTokens,
		streamingSupported,
	} = endpointOAIParametersSchema.parse(input);

	let OpenAI;
	try {
		OpenAI = (await import("openai")).OpenAI;
	} catch (e) {
		throw new Error("Failed to import OpenAI", { cause: e });
	}

	// Store router metadata if captured
	let routerMetadata: { route?: string; model?: string; provider?: string } = {};

	// Custom fetch wrapper to capture response headers for router metadata
	const customFetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
		const response = await fetch(url, init);

		// Capture router headers if present (fallback for non-streaming)
		const routeHeader = response.headers.get("X-Router-Route");
		const modelHeader = response.headers.get("X-Router-Model");
		const providerHeader = response.headers.get("x-inference-provider");

		if (routeHeader && modelHeader) {
			routerMetadata = {
				route: routeHeader,
				model: modelHeader,
				provider: providerHeader || undefined,
			};
		} else if (providerHeader) {
			// Even without router metadata, capture provider info
			routerMetadata = {
				provider: providerHeader,
			};
		}

		return response;
	};

	const openai = new OpenAI({
		apiKey: apiKey || "sk-",
		baseURL,
		defaultHeaders: {
			...(config.PUBLIC_APP_NAME === "HuggingChat" && { "User-Agent": "huggingchat" }),
			...defaultHeaders,
		},
		defaultQuery,
		fetch: customFetch,
	});

	const imageProcessor = makeImageProcessor(multimodal.image);

	if (completion === "completions") {
		return async ({
			messages,
			preprompt,
			generateSettings,
			conversationId,
			locals,
			abortSignal,
		}) => {
			const prompt = await buildPrompt({
				messages,
				preprompt,
				model,
			});

			const parameters = { ...model.parameters, ...generateSettings };
			const body: CompletionCreateParamsStreaming = {
				model: model.id ?? model.name,
				prompt,
				stream: true,
				max_tokens: parameters?.max_tokens,
				stop: parameters?.stop,
				temperature: parameters?.temperature,
				top_p: parameters?.top_p,
				frequency_penalty: parameters?.frequency_penalty,
				presence_penalty: parameters?.presence_penalty,
			};

			const openAICompletion = await openai.completions.create(body, {
				body: { ...body, ...extraBody },
				headers: {
					"ChatUI-Conversation-ID": conversationId?.toString() ?? "",
					"X-use-cache": "false",
					...(locals?.token ? { Authorization: `Bearer ${locals.token}` } : {}),
				},
				signal: abortSignal,
			});

			return openAICompletionToTextGenerationStream(openAICompletion);
		};
	} else if (completion === "chat_completions") {
		return async ({
			messages,
			preprompt,
			generateSettings,
			conversationId,
			isMultimodal,
			locals,
			abortSignal,
		}) => {
			// Format messages for the chat API, handling multimodal content if supported
			let messagesOpenAI: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
				await prepareMessages(messages, imageProcessor, isMultimodal ?? model.multimodal);

			// RAGRefine 도구가 활성화되어 있으면 시스템 프롬프트에 추가
			const ragrefineSystemPrompt = getRAGRefineSystemPrompt();
			const combinedSystemPrompt = preprompt
				? `${preprompt}\n\n${ragrefineSystemPrompt}`
				: ragrefineSystemPrompt;
			
			// Check if a system message already exists as the first message
			const hasSystemMessage = messagesOpenAI.length > 0 && messagesOpenAI[0]?.role === "system";

			if (hasSystemMessage) {
				// System message exists - append RAGRefine prompt
				const userSystemPrompt = messagesOpenAI[0].content || "";
				messagesOpenAI[0].content =
					userSystemPrompt + (userSystemPrompt ? "\n\n" : "") + ragrefineSystemPrompt;
			} else {
				// No system message exists - create a new one with RAGRefine prompt
				messagesOpenAI = [{ role: "system", content: combinedSystemPrompt }, ...messagesOpenAI];
			}

			// Combine model defaults with request-specific parameters
			const parameters = { ...model.parameters, ...generateSettings };
			
			// RAGRefine 도구를 tools 파라미터에 추가
			const ragrefineTools = getRAGRefineTools();
			const tools = ragrefineTools.length > 0 ? ragrefineTools : undefined;
			
			const body = {
				model: model.id ?? model.name,
				messages: messagesOpenAI,
				stream: streamingSupported,
				// Support two different ways of specifying token limits depending on the model
				...(useCompletionTokens
					? { max_completion_tokens: parameters?.max_tokens }
					: { max_tokens: parameters?.max_tokens }),
				stop: parameters?.stop,
				temperature: parameters?.temperature,
				top_p: parameters?.top_p,
				frequency_penalty: parameters?.frequency_penalty,
				presence_penalty: parameters?.presence_penalty,
				// RAGRefine 도구 추가
				...(tools && { tools }),
			};

			// Handle both streaming and non-streaming responses with tool calling support
			if (streamingSupported) {
				// Streaming with tool calling support
				return async function* () {
					let currentMessages = messagesOpenAI;
					let maxIterations = 10; // Prevent infinite loops
					let iteration = 0;
					
					while (iteration < maxIterations) {
						const openChatAICompletion = await openai.chat.completions.create(
							{ ...body, messages: currentMessages } as ChatCompletionCreateParamsStreaming,
							{
								body: { ...body, ...extraBody, messages: currentMessages },
								headers: {
									"ChatUI-Conversation-ID": conversationId?.toString() ?? "",
									"X-use-cache": "false",
									...(locals?.token ? { Authorization: `Bearer ${locals.token}` } : {}),
								},
								signal: abortSignal,
							}
						);
						
						// Collect chunks and check for tool_calls
						const chunks: any[] = [];
						let toolCallsMap = new Map<string, ToolCall>(); // Map by index
						let finishReason: string | null = null;
						
						for await (const chunk of openChatAICompletion) {
							chunks.push(chunk);
							const choice = chunk.choices?.[0];
							
							if (choice?.delta?.tool_calls) {
								const calls = Array.isArray(choice.delta.tool_calls)
									? choice.delta.tool_calls
									: [choice.delta.tool_calls];
								
								for (const tc of calls) {
									const idx = tc.index ?? 0;
									const id = tc.id || `call_${idx}`;
									
									if (!toolCallsMap.has(String(idx))) {
										toolCallsMap.set(String(idx), {
											id,
											type: "function",
											function: {
												name: tc.function?.name || "",
												arguments: tc.function?.arguments || "",
											},
										});
									} else {
										// Accumulate arguments
										const existing = toolCallsMap.get(String(idx))!;
										existing.function.arguments += (tc.function?.arguments || "");
									}
								}
							}
							
							if (choice?.finish_reason) {
								finishReason = choice.finish_reason;
							}
						}
						
						// Check if we have tool_calls to execute
						const toolCalls = Array.from(toolCallsMap.values());
						
						if (finishReason === "tool_calls" && toolCalls.length > 0) {
							// Execute all RAGRefine tools
							const toolResults: ToolResult[] = await Promise.all(
								toolCalls
									.filter((tc) => isRAGRefineTool(tc.function.name))
									.map((tc) => executeRAGRefineTool(tc))
							);
							
							// Add assistant message with tool_calls and tool results
							currentMessages = [
								...currentMessages,
								{
									role: "assistant",
									tool_calls: toolCalls.map((tc) => ({
										id: tc.id,
										type: tc.type,
										function: {
											name: tc.function.name,
											arguments: tc.function.arguments,
										},
									})),
								},
								...toolResults.map((tr) => ({
									role: tr.role as "tool",
									tool_call_id: tr.tool_call_id,
									name: tr.name,
									content: tr.content,
								})),
							];
							
							iteration++;
							continue; // Loop for next LLM response with tool results
						}
						
						// No tool calls, yield all chunks through the stream converter
						if (chunks.length > 0) {
							// Create an async generator from collected chunks
							const chunkStream = (async function* () {
								for (const chunk of chunks) {
									yield chunk as OpenAI.Chat.Completions.ChatCompletionChunk;
								}
							})();
							
							yield* openAIChatToTextGenerationStream(chunkStream, () => routerMetadata);
						}
						break;
					}
				}();
			} else {
				// Non-streaming with tool calling support
				let currentMessages = messagesOpenAI;
				let maxIterations = 10;
				let iteration = 0;
				
				while (iteration < maxIterations) {
					const openChatAICompletion = await openai.chat.completions.create(
						{ ...body, messages: currentMessages } as ChatCompletionCreateParamsNonStreaming,
						{
							body: { ...body, ...extraBody, messages: currentMessages },
							headers: {
								"ChatUI-Conversation-ID": conversationId?.toString() ?? "",
								"X-use-cache": "false",
								...(locals?.token ? { Authorization: `Bearer ${locals.token}` } : {}),
							},
							signal: abortSignal,
						);
					
					const message = openChatAICompletion.choices[0]?.message;
					
					// Check for tool_calls in response
					if (message?.tool_calls && message.tool_calls.length > 0) {
						// Execute RAGRefine tools
						const toolResults: ToolResult[] = await Promise.all(
							message.tool_calls
								.filter((tc: any) => isRAGRefineTool(tc.function.name))
								.map((tc: ToolCall) => executeRAGRefineTool(tc))
						);
						
						// Add assistant message and tool results
						currentMessages = [
							...currentMessages,
							{
								role: "assistant",
								tool_calls: message.tool_calls.map((tc: any) => ({
									id: tc.id,
									type: tc.type,
									function: {
										name: tc.function.name,
										arguments: tc.function.arguments,
									},
								})),
							},
							...toolResults.map((tr) => ({
								role: tr.role,
								tool_call_id: tr.tool_call_id,
								name: tr.name,
								content: tr.content,
							})),
						];
						
						iteration++;
						continue; // Loop for next LLM response
					}
					
					// No tool calls, return the response
					return openAIChatToTextGenerationSingle(openChatAICompletion, () => routerMetadata);
				}
				
				// Fallback if max iterations reached
				const finalCompletion = await openai.chat.completions.create(
					{ ...body, messages: currentMessages } as ChatCompletionCreateParamsNonStreaming,
					{
						body: { ...body, ...extraBody, messages: currentMessages },
						headers: {
							"ChatUI-Conversation-ID": conversationId?.toString() ?? "",
							"X-use-cache": "false",
							...(locals?.token ? { Authorization: `Bearer ${locals.token}` } : {}),
						},
						signal: abortSignal,
					}
				);
				return openAIChatToTextGenerationSingle(finalCompletion, () => routerMetadata);
			}
		};
	} else {
		throw new Error("Invalid completion type");
	}
}

async function prepareMessages(
	messages: EndpointMessage[],
	imageProcessor: ReturnType<typeof makeImageProcessor>,
	isMultimodal: boolean
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
	return Promise.all(
		messages.map(async (message) => {
			if (message.from === "user" && isMultimodal) {
				const imageParts = await prepareFiles(imageProcessor, message.files ?? []);
				if (imageParts.length) {
					const parts = [{ type: "text" as const, text: message.content }, ...imageParts];
					return { role: message.from, content: parts };
				}
			}
			return { role: message.from, content: message.content };
		})
	);
}

async function prepareFiles(
	imageProcessor: ReturnType<typeof makeImageProcessor>,
	files: MessageFile[]
): Promise<OpenAI.Chat.Completions.ChatCompletionContentPartImage[]> {
	const processedFiles = await Promise.all(
		files.filter((file) => file.mime.startsWith("image/")).map(imageProcessor)
	);
	return processedFiles.map((file) => ({
		type: "image_url" as const,
		image_url: {
			url: `data:${file.mime};base64,${file.image.toString("base64")}`,
			// Improves compatibility with some OpenAI-compatible servers
			// that expect an explicit detail setting.
			detail: "auto",
		},
	}));
}
