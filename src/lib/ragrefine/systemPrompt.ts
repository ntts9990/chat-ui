/**
 * RAGRefine 분석 도구에 대한 시스템 프롬프트
 * LLM이 사용 가능한 분석 도구를 쉽게 설명할 수 있도록 도와줍니다.
 */

import { RAGREFINE_TOOLS } from "./tools";

/**
 * RAGRefine 도구 목록을 사용자 친화적인 설명으로 변환
 */
export function getRAGRefineToolsDescription(): string {
	const descriptions: string[] = [];
	
	// 분석 도구 그룹
	const analysisTools = RAGREFINE_TOOLS.filter((tool) =>
		tool.function.name.startsWith("ragrefine_run_")
	);
	
	if (analysisTools.length > 0) {
		descriptions.push("## 📊 분석 도구 (Analysis Tools)");
		descriptions.push("");
		descriptions.push("다음과 같은 분석을 실행할 수 있습니다:");
		descriptions.push("");
		
		const toolMap: Record<string, string> = {
			ragrefine_run_topic_clustering: "주제 클러스터링 (군집 분석)",
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
		
		analysisTools.forEach((tool) => {
			const toolName = tool.function.name;
			const displayName = toolMap[toolName] || toolName;
			const description = tool.function.description || "";
			
			// 간단한 요약 추출 (첫 문장)
			const summary = description.split(".")[0] || description.substring(0, 100);
			
			descriptions.push(`- **${displayName}**: ${summary}`);
		});
		
		descriptions.push("");
		descriptions.push("### 사용 예시");
		descriptions.push("- \"데이터셋으로 RAGAS 분석 실행해줘\"");
		descriptions.push("- \"질문들을 주제별로 클러스터링 해줘\"");
		descriptions.push("- \"키워드 분석 해줘\"");
		descriptions.push("- \"진단 플레이북 실행해줘\"");
		descriptions.push("");
	}
	
	// 데이터셋 도구 그룹
	const datasetTools = RAGREFINE_TOOLS.filter((tool) =>
		tool.function.name.startsWith("ragrefine_list_") ||
		tool.function.name.startsWith("ragrefine_get_") ||
		tool.function.name.startsWith("ragrefine_read_")
	);
	
	if (datasetTools.length > 0) {
		descriptions.push("## 📁 데이터셋 도구 (Dataset Tools)");
		descriptions.push("");
		descriptions.push("데이터셋 정보를 조회할 수 있습니다:");
		descriptions.push("- 사용 가능한 데이터셋 목록 조회");
		descriptions.push("- 데이터셋 상세 정보 확인");
		descriptions.push("- 데이터셋 샘플 데이터 읽기");
		descriptions.push("");
	}
	
	// 결과 조회 도구 그룹
	const resultTools = RAGREFINE_TOOLS.filter((tool) =>
		tool.function.name.startsWith("ragrefine_list_analysis_") ||
		tool.function.name.startsWith("ragrefine_get_result_") ||
		tool.function.name.startsWith("ragrefine_read_result_")
	);
	
	if (resultTools.length > 0) {
		descriptions.push("## 📈 분석 결과 도구 (Result Tools)");
		descriptions.push("");
		descriptions.push("과거 분석 결과를 조회할 수 있습니다:");
		descriptions.push("- 분석 결과 목록 조회");
		descriptions.push("- 결과 요약 정보 확인");
		descriptions.push("- 결과 파일 내용 읽기");
		descriptions.push("");
	}
	
	return descriptions.join("\n");
}

/**
 * RAGRefine 시스템 프롬프트 생성
 */
export function getRAGRefineSystemPrompt(): string {
	return `당신은 RAGRefine 분석 도구를 사용할 수 있는 AI 어시스턴트입니다.

${getRAGRefineToolsDescription()}

## 중요 안내

### 도구 설명 요청
사용자가 다음과 같은 질문을 하면 **위 도구 목록을 친절하고 쉽게 설명**해주세요:
- "무슨 분석을 할 수 있냐"
- "어떤 분석 도구가 있어?"
- "분석 기능 목록 보여줘"
- "어떤 분석을 실행할 수 있나요?"
- "사용 가능한 분석 종류 알려줘"

**답변 방식**:
- 각 분석 도구를 간단명료하게 설명하세요
- 사용 예시를 함께 보여주세요
- 데이터셋이 필요하다는 점을 언급하세요

### 분석 실행
- 사용자가 분석을 요청하면 적절한 도구를 사용하여 실행하세요
- 분석 실행 시 **자동으로 의존성이 있는 다른 분석도 함께 실행**됩니다
  - 예: 진단 플레이북 실행 시 → RAGAS 분석도 자동 실행
  - 예: 종합 보고서 생성 시 → 여러 분석 자동 실행
- 도구를 사용할 때는 `dataset_path`가 필요합니다
- 사용자가 데이터셋을 지정하지 않으면 먼저 목록을 보여주고 선택하게 해주세요

### 언어
- 한국어로 응답하세요`;
}

