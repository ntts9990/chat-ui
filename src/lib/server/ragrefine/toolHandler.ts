/**
 * RAGRefine 도구 실행 핸들러
 * Chat UI에서 function calling으로 호출된 RAGRefine 도구를 실행합니다.
 */

import { RAGREFINE_TOOLS } from "$lib/ragrefine/tools";
import type { ToolDefinition } from "$lib/ragrefine/tools";

const RAGREFINE_API_URL = process.env.RAGREFINE_API_URL || "http://localhost:8080";

export interface ToolCall {
	id: string;
	type: "function";
	function: {
		name: string;
		arguments: string; // JSON string
	};
}

export interface ToolResult {
	tool_call_id: string;
	role: "tool";
	name: string;
	content: string;
}

/**
 * RAGRefine 도구인지 확인
 */
export function isRAGRefineTool(toolName: string): boolean {
	return RAGREFINE_TOOLS.some((tool) => tool.function.name === toolName);
}

/**
 * RAGRefine 도구 실행
 */
export async function executeRAGRefineTool(
	toolCall: ToolCall
): Promise<ToolResult> {
	const toolName = toolCall.function.name;
	const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

	try {
		// 도구 타입에 따라 다른 API 엔드포인트 호출
		let apiUrl = "";
		let requestBody: any = {};

		if (toolName.startsWith("ragrefine_run_")) {
			// 분석 실행 도구
			apiUrl = `${API_URL}/api/tools/execute`;
			requestBody = {
				tool_name: toolName,
				arguments: toolArgs,
			};
		} else if (toolName.startsWith("ragrefine_list_datasets")) {
			// 데이터셋 목록 조회
			apiUrl = `${API_URL}/api/datasets`;
			requestBody = null; // GET 요청
		} else if (toolName.startsWith("ragrefine_get_dataset_info")) {
			// 데이터셋 정보 조회
			apiUrl = `${API_URL}/api/datasets/${encodeURIComponent(toolArgs.dataset_path)}/info`;
			requestBody = null; // GET 요청
		} else if (toolName.startsWith("ragrefine_read_dataset_sample")) {
			// 데이터셋 샘플 읽기
			const nRows = toolArgs.n_rows || 5;
			apiUrl = `${API_URL}/api/datasets/${encodeURIComponent(toolArgs.dataset_path)}/sample?n_rows=${nRows}`;
			requestBody = null; // GET 요청
		} else if (toolName.startsWith("ragrefine_list_analysis_results")) {
			// 분석 결과 목록 조회
			apiUrl = `${API_URL}/api/results`;
			requestBody = null; // GET 요청
		} else if (toolName.startsWith("ragrefine_get_result_summary")) {
			// 결과 요약 조회
			apiUrl = `${API_URL}/api/results/${encodeURIComponent(toolArgs.run_id)}/summary`;
			requestBody = null; // GET 요청
		} else if (toolName.startsWith("ragrefine_read_result_file")) {
			// 결과 파일 읽기
			const maxLines = toolArgs.max_lines || 100;
			apiUrl = `${API_URL}/api/results/${encodeURIComponent(toolArgs.run_id)}/files/${encodeURIComponent(toolArgs.filename)}?max_lines=${maxLines}`;
			requestBody = null; // GET 요청
		} else {
			// 알 수 없는 도구
			return {
				tool_call_id: toolCall.id,
				role: "tool",
				name: toolName,
				content: `Error: Unknown tool: ${toolName}`,
			};
		}

		// API 호출
		const response = await fetch(apiUrl, {
			method: requestBody ? "POST" : "GET",
			headers: {
				"Content-Type": "application/json",
			},
			...(requestBody && { body: JSON.stringify(requestBody) }),
		});

		if (!response.ok) {
			const errorText = await response.text();
			return {
				tool_call_id: toolCall.id,
				role: "tool",
				name: toolName,
				content: `Error: ${response.status} ${errorText}`,
			};
		}

		const result = await response.json();

		// 조회 도구의 경우 결과를 사용자 친화적으로 포맷팅
		if (toolName.startsWith("ragrefine_list_datasets")) {
			const datasets = result.datasets || [];
			const count = result.count || 0;
			const datasetList = datasets
				.map((ds: any) => `- ${ds.name} (${(ds.size / 1024).toFixed(1)}KB)`)
				.join("\n");
			return {
				tool_call_id: toolCall.id,
				role: "tool",
				name: toolName,
				content: `📁 사용 가능한 데이터셋 (총 ${count}개):\n\n${datasetList || "데이터셋이 없습니다."}`,
			};
		}

		if (toolName.startsWith("ragrefine_get_dataset_info")) {
			const info = result;
			if (!info.exists) {
				return {
					tool_call_id: toolCall.id,
					role: "tool",
					name: toolName,
					content: `❌ 데이터셋을 찾을 수 없습니다: ${toolArgs.dataset_path}`,
				};
			}
			const columns = (info.columns || []).join(", ");
			return {
				tool_call_id: toolCall.id,
				role: "tool",
				name: toolName,
				content: `📊 데이터셋 정보:\n\n` +
					`- 경로: ${info.path}\n` +
					`- 행 수: ${info.rows?.toLocaleString() || "알 수 없음"}\n` +
					`- 컬럼 (${info.columns?.length || 0}개): ${columns}\n` +
					`- 크기: ${(info.size / 1024).toFixed(1)}KB`,
			};
		}

		if (toolName.startsWith("ragrefine_read_dataset_sample")) {
			const sample = result.sample || [];
			const sampleText = sample.length > 0
				? sample.map((row: any, idx: number) => 
					`\n[행 ${idx + 1}]\n${JSON.stringify(row, null, 2)}`
				).join("\n")
				: "샘플 데이터가 없습니다.";
			return {
				tool_call_id: toolCall.id,
				role: "tool",
				name: toolName,
				content: `📄 데이터셋 샘플 (${result.n_rows || 0}행, 전체 ${result.total_rows?.toLocaleString() || "?"}행):\n${sampleText}`,
			};
		}

		if (toolName.startsWith("ragrefine_list_analysis_results")) {
			const results = result.results || [];
			const count = result.count || 0;
			const resultList = results
				.map((r: any) => `- ${r.run_id} (${r.timestamp || "알 수 없음"}, 파일 ${r.file_count || 0}개)`)
				.join("\n");
			return {
				tool_call_id: toolCall.id,
				role: "tool",
				name: toolName,
				content: `📈 분석 결과 목록 (총 ${count}개):\n\n${resultList || "결과가 없습니다."}`,
			};
		}

		if (toolName.startsWith("ragrefine_get_result_summary")) {
			const summary = result.summary || {};
			const files = (result.files || []).slice(0, 10).join(", ");
			const fileInfo = result.files?.length > 10 ? `${files}... (총 ${result.files.length}개)` : files;
			return {
				tool_call_id: toolCall.id,
				role: "tool",
				name: toolName,
				content: `📋 분석 결과 요약:\n\n` +
					`- 실행 ID: ${result.run_id}\n` +
					`- 파일 수: ${result.file_count || 0}개\n` +
					`- 파일 목록: ${fileInfo || "없음"}\n` +
					`- HTML 보고서: ${summary.has_html_report ? "✅" : "❌"}\n` +
					`- Excel 보고서: ${summary.has_excel_report ? "✅" : "❌"}\n` +
					`- JSON 데이터: ${summary.has_json_data ? "✅" : "❌"}`,
			};
		}

		if (toolName.startsWith("ragrefine_read_result_file")) {
			if (result.error) {
				return {
					tool_call_id: toolCall.id,
					role: "tool",
					name: toolName,
					content: `❌ 오류: ${result.error}`,
				};
			}
			const truncated = result.truncated ? `\n\n⚠️ 일부만 표시됨 (전체 ${result.total_lines}줄 중 ${toolArgs.max_lines}줄)` : "";
			return {
				tool_call_id: toolCall.id,
				role: "tool",
				name: toolName,
				content: `📄 파일 내용 (${result.filename}):\n\n${result.content || "내용 없음"}${truncated}`,
			};
		}

		// 분석 실행 도구 처리 (기존 로직)
		if (toolName.startsWith("ragrefine_run_")) {
			// 실행 계획이 있으면 (의존성 자동 실행) 상세 정보 포함
			if (result.execution_plan && result.execution_plan.length > 0) {
                   // 실행 계획을 JSON으로 직렬화하여 전달 (UI 컴포넌트에서 파싱)
                   const executionInfo = {
                       has_dependencies: result.execution_plan.length > 1,
                       execution_plan: result.execution_plan,
                       executed_tools: result.executed_tools || [],
                       final_result: result.final_result,
                       output_dir: result.output_dir,
                       files: result.files,
                   };
                   
                   if (result.execution_plan.length > 1) {
                       const toolNames = result.execution_plan
                           .map((step: any) => step.tool_name)
                           .join(" → ");
                       return {
                           tool_call_id: toolCall.id,
                           role: "tool",
                           name: toolName,
                           content: `✅ 분석 완료 (의존성 자동 실행: ${toolNames})\n\n최종 결과:\n${result.final_result || "완료"}\n\n<execution_plan>${JSON.stringify(executionInfo)}</execution_plan>`,
                       };
                   } else {
                       // 단일 도구 실행이지만 execution_plan 정보 포함
                       return {
                           tool_call_id: toolCall.id,
                           role: "tool",
                           name: toolName,
                           content: `${result.final_result || "완료"}\n\n<execution_plan>${JSON.stringify(executionInfo)}</execution_plan>`,
                       };
                   }
               }

		// 일반 결과 반환
		return {
			tool_call_id: toolCall.id,
			role: "tool",
			name: toolName,
			content: result.final_result || result.result || "완료",
		};
	} catch (error) {
		return {
			tool_call_id: toolCall.id,
			role: "tool",
			name: toolName,
			content: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

/**
 * RAGRefine 도구 목록 반환 (OpenAI tools 형식)
 */
export function getRAGRefineTools(): ToolDefinition[] {
	return RAGREFINE_TOOLS;
}

