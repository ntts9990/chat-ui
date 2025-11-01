/**
 * RAGRefine 데이터셋 도구 실행 핸들러
 * 데이터셋 조회 및 업로드 관련 도구 처리
 */

const RAGREFINE_API_URL = process.env.RAGREFINE_API_URL || "http://localhost:8080";

export interface DatasetInfo {
	name: string;
	path: string;
	size: number;
	exists: boolean;
	source?: "builtin" | "uploaded";
}

export interface DatasetDetail {
	path: string;
	exists: boolean;
	rows: number;
	columns: string[];
	column_types: Record<string, string>;
	size: number;
}

export interface DatasetSample {
	path: string;
	sample: any[];
	n_rows: number;
	total_rows: number;
}

/**
 * 데이터셋 목록 조회
 */
export async function listDatasets(): Promise<DatasetInfo[]> {
	try {
		const response = await fetch(`${RAGREFINE_API_URL}/api/datasets`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to list datasets: ${response.status}`);
		}

		const result = await response.json();
		return result.datasets || [];
	} catch (error) {
		console.error("Error listing datasets:", error);
		throw error;
	}
}

/**
 * 데이터셋 정보 조회
 */
export async function getDatasetInfo(datasetPath: string): Promise<DatasetDetail> {
	try {
		const encodedPath = encodeURIComponent(datasetPath);
		const response = await fetch(`${RAGREFINE_API_URL}/api/datasets/${encodedPath}/info`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to get dataset info: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error getting dataset info:", error);
		throw error;
	}
}

/**
 * 데이터셋 샘플 읽기
 */
export async function readDatasetSample(
	datasetPath: string,
	nRows: number = 5
): Promise<DatasetSample> {
	try {
		const encodedPath = encodeURIComponent(datasetPath);
		const response = await fetch(
			`${RAGREFINE_API_URL}/api/datasets/${encodedPath}/sample?n_rows=${nRows}`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			}
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to read dataset sample: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error reading dataset sample:", error);
		throw error;
	}
}

/**
 * 데이터셋 파일 업로드
 */
export async function uploadDataset(file: File): Promise<{ success: boolean; path: string }> {
	try {
		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch(`${RAGREFINE_API_URL}/api/datasets`, {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to upload dataset: ${response.status}`);
		}

		const result = await response.json();
		return result;
	} catch (error) {
		console.error("Error uploading dataset:", error);
		throw error;
	}
}

