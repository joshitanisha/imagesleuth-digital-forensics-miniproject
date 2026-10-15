const API_BASE_URL = "http://127.0.0.1:8000";

/* =========================================
   IMAGE METADATA AND INTEGRITY ANALYSIS
========================================= */

export interface ImageMetadata {
  filename: string;
  format: string | null;
  width: number;
  height: number;
  mode: string;
  exif: Record<string, string>;
}

export interface AnalysisResult {
  filename: string;
  size_bytes: number;
  sha256: string;
  metadata: ImageMetadata;
  analysis_status: string;
  message: string;
}

export async function analyzeImage(
  file: File
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail ??
        `Image analysis failed: HTTP ${response.status}`
    );
  }

  return (await response.json()) as AnalysisResult;
}

/* =========================================
   ERROR LEVEL ANALYSIS
========================================= */

export interface ELAResult {
  filename: string;
  analysis_type: string;
  jpeg_quality: number;
  ela_image: string;
  image_format: string;
  analysis_status: string;
  interpretation: string;
}

export async function performELA(
  file: File,
  quality: number = 90
): Promise<ELAResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/ela?quality=${quality}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail ??
        `ELA analysis failed: HTTP ${response.status}`
    );
  }

  return (await response.json()) as ELAResult;
}

/* =========================================
   NOISE RESIDUAL ANALYSIS
========================================= */

export interface NoiseResult {
  filename: string;
  analysis_type: string;
  noise_image: string;
  image_format: string;
  analysis_status: string;
  interpretation: string;
}

export async function analyzeNoise(
  file: File
): Promise<NoiseResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/noise`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail ??
        `Noise analysis failed: HTTP ${response.status}`
    );
  }

  return (await response.json()) as NoiseResult;
}

/* =========================================
   COPY-MOVE DETECTION
========================================= */

export interface CopyMoveResult {
  filename: string;
  analysis_type: string;
  keypoints_detected: number;
  candidate_matches: number;
  potential_copy_move: boolean;
  visualization: string;
  image_format: string;
  analysis_status: string;
  interpretation: string;
}

export async function detectCopyMove(
  file: File
): Promise<CopyMoveResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/copy-move`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail ??
        `Copy-move analysis failed: HTTP ${response.status}`
    );
  }

  return (await response.json()) as CopyMoveResult;
}

/* =========================================
   IMAGE COMPARISON
========================================= */

export interface ImageComparisonResult {
  filename_a: string;
  filename_b: string;
  analysis_type: string;
  analysis_status: string;

  mae: number;
  ssim: number;
  similarity_percentage: number;

  dimensions_a: {
    width: number;
    height: number;
  };

  dimensions_b: {
    width: number;
    height: number;
  };

  resized_for_comparison: boolean;
  difference_map: string;
  interpretation: string;
}

export async function compareImages(
  fileA: File,
  fileB: File
): Promise<ImageComparisonResult> {
  const formData = new FormData();

  formData.append("file_a", fileA);
  formData.append("file_b", fileB);

  const response = await fetch(
    `${API_BASE_URL}/api/compare`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail ??
        `Image comparison failed: HTTP ${response.status}`
    );
  }

  return (await response.json()) as ImageComparisonResult;
}

/* =========================================
   PDF FORENSIC REPORT
========================================= */

export interface ForensicReportRequest {
  report_id?: string;
  filename: string;
  analysis_date?: string;
  size_bytes: number;
  sha256: string;

  metadata: {
    format: string | null;
    width: number;
    height: number;
    mode: string;
    exif: Record<string, string>;
  };

  ela?: Record<string, unknown>;
  noise?: Record<string, unknown>;
  copy_move?: Record<string, unknown>;
  comparison?: Record<string, unknown>;
}

export async function downloadForensicReport(
  report: ForensicReportRequest
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(report),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail ??
        `PDF report generation failed: HTTP ${response.status}`
    );
  }

  const blob = await response.blob();

  if (blob.type && blob.type !== "application/pdf") {
    throw new Error(
      "The server response was not a valid PDF document."
    );
  }

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const safeFilename = report.filename.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );

  link.href = downloadUrl;
  link.download = `${safeFilename}_forensic_report.pdf`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
}

/* =========================================
   ANALYSIS HISTORY TYPES
========================================= */

export interface AnalysisHistoryItem {
  id: number;
  filename: string;
  file_size: number;
  sha256: string;
  image_format: string | null;
  width: number;
  height: number;
  analysis_type: string;
  status: string;
  created_at: string;
}

export interface AnalysisHistoryDetail extends AnalysisHistoryItem {
  results_json?: string;
  results?: Record<string, unknown>;
}

/* =========================================
   GET ANALYSIS HISTORY
========================================= */

export async function getAnalysisHistory(
  limit: number = 50,
  offset: number = 0
): Promise<AnalysisHistoryItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/history?limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch analysis history: HTTP ${response.status}`
    );
  }

  const data: unknown = await response.json();

  /*
   * The backend response format is:
   *
   * {
   *   "count": 6,
   *   "records": [...]
   * }
   *
   * Extract the records array for the React component.
   */

  if (
    data !== null &&
    typeof data === "object" &&
    "records" in data &&
    Array.isArray(data.records)
  ) {
    return data.records as AnalysisHistoryItem[];
  }

  throw new Error(
    "Unexpected analysis history response format."
  );
}

/* =========================================
   GET ANALYSIS DETAILS
========================================= */

export async function getAnalysisById(
  recordId: number
): Promise<AnalysisHistoryDetail> {
  const response = await fetch(
    `${API_BASE_URL}/api/history/${recordId}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch analysis details: HTTP ${response.status}`
    );
  }

  return (await response.json()) as AnalysisHistoryDetail;
}

/* =========================================
   DELETE ANALYSIS RECORD
========================================= */

export async function deleteAnalysis(
  recordId: number
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/history/${recordId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to delete analysis record: HTTP ${response.status}`
    );
  }
}