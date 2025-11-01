/**
 * RAGRefine 데이터셋 업로드 함수
 * CSV, Excel 등의 데이터셋 파일을 RAGRefine API에 업로드합니다.
 */

const RAGREFINE_API_URL = process.env.RAGREFINE_API_URL || "http://localhost:8080";

export interface DatasetUploadResult {
	success: boolean;
	filename: string;
	path: string;
	size: number;
	error?: string;
}

/**
 * 데이터셋 파일을 RAGRefine API에 업로드
 */
export async function uploadDatasetToRAGRefine(
	file: File
): Promise<DatasetUploadResult> {
	try {
		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch(`${RAGREFINE_API_URL}/api/datasets`, {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
			return {
				success: false,
				filename: file.name,
				path: "",
				size: file.size,
				error: error.error || `Failed to upload: ${response.status}`,
			};
		}

		const result = await response.json();
		return {
			success: true,
			filename: result.filename || file.name,
			path: result.path || "",
			size: result.size || file.size,
		};
	} catch (error) {
		return {
			success: false,
			filename: file.name,
			path: "",
			size: file.size,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * 파일이 데이터셋 형식인지 확인
 */
export function isDatasetFile(file: File): boolean {
	const datasetExtensions = [".csv", ".xlsx", ".xls", ".tsv", ".json", ".parquet"];
	const fileName = file.name.toLowerCase();
	return datasetExtensions.some((ext) => fileName.endsWith(ext));
}

/**
 * 파일 타입이 데이터셋인지 확인 (MIME type 기반)
 */
export function isDatasetMimeType(mimeType: string): boolean {
	const datasetMimeTypes = [
		"text/csv",
		"application/vnd.ms-excel",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
		"application/vnd.ms-excel", // .xls
		"text/tab-separated-values",
		"application/json",
		"application/parquet",
	];
	return datasetMimeTypes.includes(mimeType.toLowerCase());
}

