<script lang="ts">
	/**
	 * 분석 도구 실행 승인 요청 모달
	 * 사용자가 분석 도구 실행을 승인/거부할 수 있는 UI
	 */

	import Modal from "../Modal.svelte";
	import CarbonClose from "~icons/carbon/close";
	import { createEventDispatcher } from "svelte";

	export interface ApprovalRequest {
		tool_name: string;
		tool_display_name: string;
		tool_args: Record<string, any>;
		dataset_path: string;
		estimated_time?: string;
		question?: string;
		extras?: Record<string, any>;
	}

	interface Props {
		open?: boolean;
		request: ApprovalRequest | null;
	}

	let { open = $bindable(false), request }: Props = $props();

	const dispatch = createEventDispatcher<{
		approved: { approved: boolean };
	}>();

	function handleApprove() {
		if (request) {
			dispatch("approved", { approved: true });
			open = false;
		}
	}

	function handleReject() {
		if (request) {
			dispatch("approved", { approved: false });
			open = false;
		}
	}

	// 데이터셋 파일명 추출
	let datasetName = $derived(() => {
		if (!request?.dataset_path) return "데이터셋 미지정";
		const pathParts = request.dataset_path.split("/");
		return pathParts[pathParts.length - 1] || request.dataset_path;
	});
</script>

{#if open && request}
	<Modal onclose={() => (open = false)} width="w-full !max-w-lg">
		<div class="flex w-full flex-col gap-5 p-6">
			<!-- Header -->
			<div class="flex items-start justify-between">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30"
					>
						<span class="text-xl">🔍</span>
					</div>
					<div>
						<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">분석 실행 승인</h2>
						<p class="text-sm text-gray-500 dark:text-gray-400">아래 분석을 실행하시겠습니까?</p>
					</div>
				</div>
				<button type="button" class="group" onclick={() => (open = false)}>
					<CarbonClose
						class="mt-auto text-gray-900 group-hover:text-gray-500 dark:text-gray-200 dark:group-hover:text-gray-400"
					/>
				</button>
			</div>

			<!-- Content -->
			<div class="mb-6 space-y-4">
				<!-- 분석 도구 정보 -->
				<div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
					<div class="mb-2 flex items-center gap-2">
						<span class="text-sm font-medium text-gray-700 dark:text-gray-300">분석 도구</span>
					</div>
					<div class="text-base font-semibold text-gray-900 dark:text-gray-100">
						{request.tool_display_name || request.tool_name}
					</div>
				</div>

				<!-- 데이터셋 정보 -->
				<div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
					<div class="mb-2 flex items-center gap-2">
						<span class="text-sm font-medium text-gray-700 dark:text-gray-300">데이터셋</span>
					</div>
					<div class="font-mono text-sm text-gray-900 dark:text-gray-100">{datasetName}</div>
					{#if request.dataset_path && request.dataset_path !== datasetName}
						<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{request.dataset_path}
						</div>
					{/if}
				</div>

				<!-- 예상 시간 -->
				{#if request.estimated_time}
					<div class="flex items-center gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
						<span class="text-sm">⏱️</span>
						<span class="text-sm text-gray-700 dark:text-gray-300">
							예상 소요 시간: {request.estimated_time}
						</span>
					</div>
				{/if}

				<!-- 추가 질문 -->
				{#if request.question && request.question !== "이 작업을 실행하시겠습니까?"}
					<div class="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
						<p class="text-sm text-gray-700 dark:text-gray-300">{request.question}</p>
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex gap-3">
				<button
					type="button"
					class="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
					onclick={handleReject}
				>
					취소
				</button>
				<button
					type="button"
					class="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
					onclick={handleApprove}
				>
					실행
				</button>
			</div>
		</div>
	</Modal>
{/if}

