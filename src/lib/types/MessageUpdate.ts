import type { InferenceProvider } from "@huggingface/inference";

export type MessageUpdate =
	| MessageStatusUpdate
	| MessageTitleUpdate
	| MessageStreamUpdate
	| MessageFileUpdate
	| MessageFinalAnswerUpdate
	| MessageReasoningUpdate
	| MessageRouterMetadataUpdate
	| MessageActiveAnalysisUpdate
	| MessageApprovalRequestUpdate;

export enum MessageUpdateType {
	Status = "status",
	Title = "title",
	Stream = "stream",
	File = "file",
	FinalAnswer = "finalAnswer",
	Reasoning = "reasoning",
	RouterMetadata = "routerMetadata",
	ActiveAnalysis = "activeAnalysis",
	ApprovalRequest = "approvalRequest",
}

// Status
export enum MessageUpdateStatus {
	Started = "started",
	Error = "error",
	Finished = "finished",
	KeepAlive = "keepAlive",
}
export interface MessageStatusUpdate {
	type: MessageUpdateType.Status;
	status: MessageUpdateStatus;
	message?: string;
	statusCode?: number;
}

// Everything else
export interface MessageTitleUpdate {
	type: MessageUpdateType.Title;
	title: string;
}
export interface MessageStreamUpdate {
	type: MessageUpdateType.Stream;
	token: string;
}

export enum MessageReasoningUpdateType {
	Stream = "stream",
	Status = "status",
}

export type MessageReasoningUpdate = MessageReasoningStreamUpdate | MessageReasoningStatusUpdate;

export interface MessageReasoningStreamUpdate {
	type: MessageUpdateType.Reasoning;
	subtype: MessageReasoningUpdateType.Stream;
	token: string;
}
export interface MessageReasoningStatusUpdate {
	type: MessageUpdateType.Reasoning;
	subtype: MessageReasoningUpdateType.Status;
	status: string;
}

export interface MessageFileUpdate {
	type: MessageUpdateType.File;
	name: string;
	sha: string;
	mime: string;
}
export interface MessageFinalAnswerUpdate {
	type: MessageUpdateType.FinalAnswer;
	text: string;
	interrupted: boolean;
}
export interface MessageRouterMetadataUpdate {
	type: MessageUpdateType.RouterMetadata;
	route: string;
	model: string;
	provider?: InferenceProvider;
}

// RAGRefine Active Analysis Update
export interface MessageActiveAnalysisUpdate {
	type: MessageUpdateType.ActiveAnalysis;
	activeAnalysis: {
		tool_name: string;
		tool_display_name?: string;
		dataset_path: string;
		status: "executing" | "completed" | "failed";
		started_at?: string | null;
		results?: any;
	} | null;
}

// RAGRefine Approval Request Update
export interface MessageApprovalRequestUpdate {
	type: MessageUpdateType.ApprovalRequest;
	tool_name: string;
	tool_display_name: string;
	tool_args: Record<string, any>;
	dataset_path: string;
	estimated_time?: string;
	question?: string;
	extras?: Record<string, any>;
}
