<script lang="ts">
	/**
	 * 활성 분석 컨텍스트를 표시하는 배지 컴포넌트
	 * 현재 진행 중이거나 완료된 분석을 시각적으로 표시합니다.
	 */

	export interface ActiveAnalysis {
		tool_name: string;
		tool_display_name?: string;
		dataset_path: string;
		status: "executing" | "completed" | "failed";
		started_at?: string | null;
		results?: any;
	}

	interface Props {
		activeAnalysis: ActiveAnalysis | null | undefined;
		showDetails?: boolean;
	}

	let { activeAnalysis, showDetails = false }: Props = $props();

	// 상태별 스타일
	const statusConfig = {
		executing: {
			label: "분석 중",
			bgColor: "bg-blue-50 dark:bg-blue-900/20",
			textColor: "text-blue-700 dark:text-blue-300",
			borderColor: "border-blue-200 dark:border-blue-800",
			icon: "🔄",
		},
		completed: {
			label: "분석 완료",
			bgColor: "bg-green-50 dark:bg-green-900/20",
			textColor: "text-green-700 dark:text-green-300",
			borderColor: "border-green-200 dark:border-green-800",
			icon: "✅",
		},
		failed: {
			label: "분석 실패",
			bgColor: "bg-red-50 dark:bg-red-900/20",
			textColor: "text-red-700 dark:text-red-300",
			borderColor: "border-red-200 dark:border-red-800",
			icon: "❌",
		},
	};

	let config = $derived(
		activeAnalysis
			? statusConfig[activeAnalysis.status] || statusConfig.executing
			: statusConfig.executing
	);

	// 데이터셋 파일명 추출
	let datasetName = $derived(() => {
		if (!activeAnalysis?.dataset_path) return "데이터셋 미지정";
		const pathParts = activeAnalysis.dataset_path.split("/");
		return pathParts[pathParts.length - 1] || activeAnalysis.dataset_path;
	});

	// 도구 표시명
	let toolDisplayName = $derived(
		activeAnalysis?.tool_display_name || activeAnalysis?.tool_name || "알 수 없음"
	);
</script>

{#if activeAnalysis}
	<div
		class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm {config.bgColor} {config.textColor} {config.borderColor} transition-colors"
		title="현재 활성 분석: {toolDisplayName}"
	>
		<span class="text-base">{config.icon}</span>
		<div class="flex flex-col gap-0.5">
			<div class="flex items-center gap-2">
				<span class="font-medium">{toolDisplayName}</span>
				<span
					class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {config.bgColor} {config.textColor}"
				>
					{config.label}
				</span>
			</div>
			{#if showDetails}
				<div class="text-xs opacity-75">
					<span class="font-mono">{datasetName}</span>
				</div>
			{/if}
		</div>
	</div>
{/if}

