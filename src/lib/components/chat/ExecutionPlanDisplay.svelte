<script lang="ts">
	/**
	 * 의존성 그래프 기반 자동 실행 계획 표시 컴포넌트
	 * 여러 도구가 자동으로 실행된 경우 실행 계획을 시각적으로 표시합니다.
	 */

	export interface ExecutionStep {
		tool_name: string;
		status: "executed" | "skipped" | "failed";
		required: boolean;
		result_preview?: string;
		error?: string;
		reason?: string;
	}

	interface Props {
		executionPlan: ExecutionStep[];
		executedTools?: string[];
		showDetails?: boolean;
	}

	let { executionPlan, executedTools = [], showDetails = false }: Props = $props();

	// 실행된 도구가 1개 이상인 경우에만 표시
	let shouldShow = $derived(executionPlan.length > 0 && executionPlan.length > 1);

	// 도구 표시명 맵핑
	const toolDisplayNames: Record<string, string> = {
		ragrefine_run_topic_clustering: "주제 클러스터링",
		ragrefine_run_ragas_analysis: "RAGAS 분석",
		ragrefine_run_keybert_analysis: "키워드 분석",
		ragrefine_run_question_semantic_analysis: "질문 의미 분석",
		ragrefine_run_question_type_classification: "질문 유형 분류",
		ragrefine_run_context_semantic_analysis: "컨텍스트 의미 분석",
		ragrefine_run_diagnostic_playbook: "진단 플레이북",
		ragrefine_run_temporal_analysis: "시계열 분석",
		ragrefine_run_causal_analysis: "인과관계 분석",
		ragrefine_run_user_dictionary_analysis: "사용자 사전 분석",
		ragrefine_run_network_graph_analysis: "네트워크 그래프 분석",
		ragrefine_run_comprehensive_report: "종합 보고서 생성",
	};

	function getDisplayName(toolName: string): string {
		return toolDisplayNames[toolName] || toolName.replace("ragrefine_run_", "").replace(/_/g, " ");
	}

	function getStatusIcon(status: string): string {
		switch (status) {
			case "executed":
				return "✅";
			case "skipped":
				return "⏭️";
			case "failed":
				return "❌";
			default:
				return "⏳";
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case "executed":
				return "text-green-600 dark:text-green-400";
			case "skipped":
				return "text-gray-500 dark:text-gray-400";
			case "failed":
				return "text-red-600 dark:text-red-400";
			default:
				return "text-yellow-600 dark:text-yellow-400";
		}
	}
</script>

{#if shouldShow}
	<div
		class="mt-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
	>
		<div class="mb-3 flex items-center gap-2">
			<span class="text-lg">🔄</span>
			<h4 class="font-semibold text-gray-900 dark:text-gray-100">
				자동 실행된 분석 (의존성 자동 해결)
			</h4>
		</div>

		<div class="space-y-2">
			{#each executionPlan as step, index}
				<div
					class="flex items-start gap-3 rounded-md bg-white p-3 shadow-sm dark:bg-gray-800"
				>
					<!-- 단계 번호 -->
					<div
						class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
					>
						{index + 1}
					</div>

					<!-- 도구 정보 -->
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="text-base">{getStatusIcon(step.status)}</span>
							<span class="font-medium text-gray-900 dark:text-gray-100">
								{getDisplayName(step.tool_name)}
							</span>
							{#if !step.required}
								<span
									class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
								>
									선택적
								</span>
							{/if}
						</div>

						<div class="mt-1 flex items-center gap-2 text-sm">
							<span class={getStatusColor(step.status)}>
								{step.status === "executed"
									? "실행 완료"
									: step.status === "skipped"
										? "건너뜀"
										: "실패"}
							</span>
							{#if step.reason && step.status === "skipped"}
								<span class="text-xs text-gray-500 dark:text-gray-400">
									({step.reason})
								</span>
							{/if}
						</div>

						{#if showDetails && step.result_preview && step.status === "executed"}
							<div
								class="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
							>
								{step.result_preview.substring(0, 200)}
								{step.result_preview.length > 200 ? "..." : ""}
							</div>
						{/if}

						{#if step.error && step.status === "failed"}
							<div
								class="mt-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300"
							>
								오류: {step.error}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		{#if executedTools && executedTools.length > 0}
			<div class="mt-3 text-xs text-gray-600 dark:text-gray-400">
				실행 순서: {executedTools.map((t) => getDisplayName(t)).join(" → ")}
			</div>
		{/if}
	</div>
{/if}

