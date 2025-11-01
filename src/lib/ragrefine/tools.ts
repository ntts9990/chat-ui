/**
 * RAGRefine 도구 정의
 * OpenAI Function Calling 형식으로 정의하여 LLM이 명확하게 구별할 수 있도록 구성
 */

export interface ToolDefinition {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: {
			type: "object";
			properties: Record<string, any>;
			required: string[];
		};
	};
}

/**
 * RAGRefine 분석 실행 도구들
 */
export const RAGREFINE_ANALYSIS_TOOLS: ToolDefinition[] = [
	{
		type: "function",
		function: {
			name: "ragrefine_run_ragas_analysis",
			description: `RAGAS 5개 핵심 메트릭(정확성, 충실도, 맥락 활용도, 답변 관련성, 맥락 정밀도)을 계산하여 RAG 시스템의 전반적인 성능을 평가합니다. 
데이터셋의 각 질문-답변 쌍에 대해 메트릭 점수를 계산하고 통계를 제공합니다. 
키워드 추출이나 주제 분석 없이 순수하게 RAGAS 메트릭만 계산하는 도구입니다.
사용 시나리오: RAG 시스템의 기본 성능 평가가 필요할 때, 다른 분석 도구들과는 별도로 메트릭만 계산하고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {
					dataset_path: {
						type: "string",
						description: "RAGAS 형식의 CSV 데이터셋 파일 경로. 반드시 question, contexts, answer, ground_truth 컬럼을 포함해야 합니다.",
						examples: ["data/sample_ragas_dataset.csv", "data/extended_temporal_ragas_dataset.csv"]
					}
				},
				required: ["dataset_path"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ragrefine_run_keybert_analysis",
			description: `KeyBERT를 사용하여 데이터셋에서 주요 키워드를 추출하고 빈도를 분석합니다. 
RAGAS 메트릭 계산 없이 키워드 분석만 수행합니다.
데이터셋의 질문과 답변에서 주요 키워드를 추출하여 주제 파악이나 키워드 기반 분석에 활용합니다.
사용 시나리오: 데이터셋의 주요 주제를 파악하고 싶을 때, 키워드 기반 패턴 분석이 필요할 때, RAGAS 메트릭과는 별도로 키워드 정보만 얻고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {
					dataset_path: {
						type: "string",
						description: "분석할 데이터셋 CSV 파일 경로",
						examples: ["data/sample_ragas_dataset.csv"]
					},
					top_n: {
						type: "integer",
						description: "추출할 상위 키워드 개수 (1-100 사이, 기본값: 20)",
						minimum: 1,
						maximum: 100,
						default: 20
					}
				},
				required: ["dataset_path"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ragrefine_run_topic_clustering",
			description: `BERTopic을 사용하여 데이터셋의 질문들을 주제별로 클러스터링합니다.
질문의 의미적 유사성을 기반으로 주제를 자동으로 탐지하고 각 질문을 해당 주제에 할당합니다.
주제 수는 자동으로 결정되거나 사용자가 지정할 수 있습니다.
사용 시나리오: 질문들을 주제별로 분류하고 싶을 때, 데이터셋의 주요 주제 영역을 파악하고 싶을 때, 유사한 질문들을 그룹화하고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {
					dataset_path: {
						type: "string",
						description: "클러스터링할 데이터셋 CSV 파일 경로",
						examples: ["data/sample_ragas_dataset.csv"]
					},
					n_topics: {
						type: "integer",
						description: "생성할 주제 개수 (2-50 사이, 없으면 자동 결정)",
						minimum: 2,
						maximum: 50,
						default: null
					}
				},
				required: ["dataset_path"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ragrefine_run_comprehensive_report",
			description: `RAG 시스템에 대한 종합적인 분석 보고서를 생성합니다.
RAGAS 메트릭, 키워드 분석, 주제 클러스터링 등 다양한 분석을 종합하여 전체적인 인사이트를 제공합니다.
LLM을 활용하여 전문가 수준의 해석과 개선 권장사항을 포함합니다.
사용 시나리오: 전체적인 시스템 평가 보고서가 필요할 때, 다양한 분석 결과를 종합하여 이해하고 싶을 때, 개선 방향을 제시하는 종합 보고서가 필요할 때.`,
			parameters: {
				type: "object",
				properties: {
					dataset_path: {
						type: "string",
						description: "분석할 데이터셋 CSV 파일 경로",
						examples: ["data/sample_ragas_dataset.csv"]
					},
					model: {
						type: "string",
						description: "Ollama 모델 이름 (보고서 생성에 사용할 LLM 모델)",
						default: "gpt-oss:20b",
						examples: ["gpt-oss:20b", "llama3:8b", "mistral:7b"]
					},
					temperature: {
						type: "number",
						description: "LLM temperature (0.0=결정론적, 1.0=창의적, 기본값: 0.3)",
						minimum: 0.0,
						maximum: 1.0,
						default: 0.3
					}
				},
				required: ["dataset_path"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ragrefine_run_question_type_classification",
			description: `질문 유형을 부품/코드형, 개념형, 절차/조치형으로 분류합니다.
각 질문 유형에 맞는 최적의 검색 전략과 키워드 가중치를 제안합니다.
LLM과 휴리스틱 기반 분류를 결합하여 정확도를 높입니다.
사용 시나리오: 질문의 유형을 파악하고 적절한 검색 전략을 수립하고 싶을 때, 유형별 성능 차이를 분석하고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {
					dataset_path: {
						type: "string",
						description: "분류할 데이터셋 CSV 파일 경로",
						examples: ["data/sample_ragas_dataset.csv"]
					},
					batch_size: {
						type: "integer",
						description: "배치당 처리할 질문 수 (1-50 사이, 기본값: 10)",
						minimum: 1,
						maximum: 50,
						default: 10
					}
				},
				required: ["dataset_path"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ragrefine_run_temporal_analysis",
			description: `시계열 데이터를 분석하여 시간에 따른 성능 추이를 파악합니다.
과거 분석 결과와 현재 결과를 비교하여 성능 변화를 추적합니다.
시점별 메트릭 변화, 패턴 인식, 트렌드 분석을 제공합니다.
사용 시나리오: 시간에 따른 성능 변화를 추적하고 싶을 때, 개선 효과를 확인하고 싶을 때, 트렌드를 파악하고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {
					dataset_path: {
						type: "string",
						description: "현재 데이터셋 CSV 파일 경로",
						examples: ["data/extended_temporal_ragas_dataset.csv"]
					},
					history_dir: {
						type: "string",
						description: "과거 분석 결과가 저장된 디렉토리 경로",
						default: "data/history",
						examples: ["data/history", "output_analysis"]
					}
				},
				required: ["dataset_path"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ragrefine_run_diagnostic_playbook",
			description: `낮은 성능을 보이는 샘플에 대한 진단 플레이북을 생성합니다.
RAGAS 메트릭 결과를 바탕으로 문제 원인을 분석하고 개선 방안을 제시합니다.
각 메트릭별로 성능 저하 원인과 해결책을 체계적으로 제공합니다.
사용 시나리오: 낮은 성능 샘플의 원인을 파악하고 싶을 때, 체계적인 개선 가이드가 필요할 때, 메트릭별 문제 해결책을 찾고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {
					dataset_path: {
						type: "string",
						description: "RAGAS 메트릭이 포함된 데이터셋 CSV 파일 경로",
						examples: ["data/sample_ragas_dataset.csv"]
					}
				},
				required: ["dataset_path"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ragrefine_run_user_dictionary_analysis",
			description: `사용자 정의 사전을 활용하여 도메인 특화 키워드 분석을 수행합니다.
커스텀 사전의 키워드가 데이터셋에 얼마나 포함되어 있는지 분석합니다.
도메인 전문 용어나 특수 키워드의 사용 빈도와 패턴을 파악합니다.
사용 시나리오: 도메인 특화 용어 분석이 필요할 때, 커스텀 사전의 활용도를 확인하고 싶을 때, 전문 용어 기반 분석이 필요할 때.`,
			parameters: {
				type: "object",
				properties: {
					dataset_path: {
						type: "string",
						description: "분석할 데이터셋 CSV 파일 경로",
						examples: ["data/sample_ragas_dataset.csv"]
					},
					dictionary_path: {
						type: "string",
						description: "사용자 정의 사전 파일 경로",
						default: "data/user_dictionary.txt",
						examples: ["data/user_dictionary.txt", "custom_dict.txt"]
					}
				},
				required: ["dataset_path"]
			}
		}
	}
];

/**
 * 데이터셋 조회 도구들
 */
export const RAGREFINE_DATASET_TOOLS: ToolDefinition[] = [
	{
		type: "function",
		function: {
			name: "ragrefine_list_datasets",
			description: `사용 가능한 모든 데이터셋 목록을 조회합니다.
data/ 디렉토리와 업로드된 데이터셋을 포함하여 모든 CSV 데이터셋 파일을 나열합니다.
각 데이터셋의 기본 정보(이름, 경로, 크기)를 제공합니다.
사용 시나리오: 어떤 데이터셋이 있는지 확인하고 싶을 때, 분석할 데이터셋을 선택하기 전에 목록을 보고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {},
				required: []
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ragrefine_get_dataset_info",
			description: `특정 데이터셋의 상세 정보를 조회합니다.
데이터셋의 행 수, 컬럼 목록, 데이터 타입, 샘플 데이터 등의 정보를 제공합니다.
데이터셋 구조를 파악하고 분석 가능 여부를 확인하는데 유용합니다.
사용 시나리오: 데이터셋의 구조를 확인하고 싶을 때, 분석 전에 데이터셋이 올바른 형식인지 확인하고 싶을 때, 데이터셋의 크기와 내용을 파악하고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {
					dataset_path: {
						type: "string",
						description: "정보를 조회할 데이터셋 파일 경로",
						examples: ["data/sample_ragas_dataset.csv"]
					}
				},
				required: ["dataset_path"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ragrefine_read_dataset_sample",
			description: `데이터셋의 샘플 데이터를 읽어서 표시합니다.
처음 N개 행의 데이터를 반환하여 데이터셋의 실제 내용을 확인할 수 있게 합니다.
사용 시나리오: 데이터셋의 실제 데이터를 확인하고 싶을 때, 샘플을 보고 데이터 품질을 검증하고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {
					dataset_path: {
						type: "string",
						description: "샘플을 읽을 데이터셋 파일 경로",
						examples: ["data/sample_ragas_dataset.csv"]
					},
					n_rows: {
						type: "integer",
						description: "읽을 샘플 행 수 (기본값: 5)",
						minimum: 1,
						maximum: 100,
						default: 5
					}
				},
				required: ["dataset_path"]
			}
		}
	}
];

/**
 * 분석 결과 조회 도구들
 */
export const RAGREFINE_RESULT_TOOLS: ToolDefinition[] = [
	{
		type: "function",
		function: {
			name: "ragrefine_list_analysis_results",
			description: `모든 분석 실행 결과 목록을 조회합니다.
output_analysis/ 디렉토리에서 실행된 모든 분석 결과를 시간순으로 나열합니다.
각 결과의 실행 시간, 데이터셋, 분석 유형 등의 메타데이터를 제공합니다.
사용 시나리오: 이전 분석 결과를 찾고 싶을 때, 분석 이력을 확인하고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {},
				required: []
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ragrefine_get_result_summary",
			description: `특정 분석 결과의 요약 정보를 조회합니다.
분석 결과 디렉토리에서 주요 메트릭, 생성된 파일 목록, 실행 정보 등을 요약하여 제공합니다.
사용 시나리오: 분석 결과의 핵심 내용을 빠르게 파악하고 싶을 때, 어떤 파일들이 생성되었는지 확인하고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {
					run_id: {
						type: "string",
						description: "분석 실행 ID (디렉토리 이름, 예: 20251030_075548)",
						examples: ["20251030_075548"]
					}
				},
				required: ["run_id"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ragrefine_read_result_file",
			description: `분석 결과 파일의 내용을 읽어서 표시합니다.
CSV, JSON, Markdown 등 텍스트 형식의 결과 파일을 읽어 내용을 반환합니다.
큰 파일의 경우 일부만 읽어서 표시할 수 있습니다.
사용 시나리오: 특정 결과 파일의 내용을 확인하고 싶을 때, 분석 결과를 상세히 검토하고 싶을 때.`,
			parameters: {
				type: "object",
				properties: {
					run_id: {
						type: "string",
						description: "분석 실행 ID",
						examples: ["20251030_075548"]
					},
					filename: {
						type: "string",
						description: "읽을 파일 이름",
						examples: ["ragas_analysis_report.html", "summary.json"]
					},
					max_lines: {
						type: "integer",
						description: "최대 읽을 줄 수 (기본값: 100, 큰 파일의 경우 제한)",
						minimum: 1,
						maximum: 1000,
						default: 100
					}
				},
				required: ["run_id", "filename"]
			}
		}
	}
];

/**
 * 모든 RAGRefine 도구 통합
 */
export const RAGREFINE_TOOLS: ToolDefinition[] = [
	...RAGREFINE_ANALYSIS_TOOLS,
	...RAGREFINE_DATASET_TOOLS,
	...RAGREFINE_RESULT_TOOLS
];

