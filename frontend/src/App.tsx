import { useEffect, useState } from "react";
import "./App.css";

import {
  analyzeImage,
  performELA,
  analyzeNoise,
  detectCopyMove,
  compareImages,
  downloadForensicReport,
  getAnalysisHistory,
  getAnalysisById,
  deleteAnalysis,
  type AnalysisResult,
  type ELAResult,
  type NoiseResult,
  type CopyMoveResult,
  type ImageComparisonResult,
  type ForensicReportRequest,
  type AnalysisHistoryItem,
  type AnalysisHistoryDetail,
} from "./services/api";

/* =========================================
   TYPES AND CONFIGURATION
========================================= */

type Page =
  | "Overview"
  | "Analyze Image"
  | "Compare Images"
  | "Analysis History"
  | "Reports";

interface SharedReportData {
  filename: string;
  size_bytes: number;
  sha256: string;
  metadata: AnalysisResult["metadata"] | null;
  ela: ELAResult | null;
  noise: NoiseResult | null;
  copyMove: CopyMoveResult | null;
  comparison: ImageComparisonResult | null;
}

const initialReportData: SharedReportData = {
  filename: "ImageSleuth_Analysis",
  size_bytes: 0,
  sha256: "",
  metadata: null,
  ela: null,
  noise: null,
  copyMove: null,
  comparison: null,
};

const navigation: { name: Page; icon: string }[] = [
  { name: "Overview", icon: "▦" },
  { name: "Analyze Image", icon: "⌕" },
  { name: "Compare Images", icon: "◫" },
  { name: "Analysis History", icon: "◷" },
  { name: "Reports", icon: "▤" },
];

/* =========================================
   MAIN APPLICATION
========================================= */

function App() {
  const [activePage, setActivePage] = useState<Page>("Overview");

  const [reportData, setReportData] =
    useState<SharedReportData>(initialReportData);

  function updateReportData(
    updates: Partial<SharedReportData>
  ) {
    setReportData((previous) => ({
      ...previous,
      ...updates,
    }));
  }

  function resetImageReportData(
    filename: string,
    sizeBytes: number
  ) {
    setReportData({
      ...initialReportData,
      filename,
      size_bytes: sizeBytes,
    });
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">IS</div>

          <div>
            <h2>ImageSleuth</h2>
            <p>Digital Forensics</p>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="status-dot" />

          <div>
            <p className="status-title">Forensic Workspace</p>
            <p className="status-subtitle">Local environment</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              Workspace / {activePage}
            </p>

            <h1>{activePage}</h1>
          </div>

          <div className="topbar-right">
            <span className="environment-badge">
              <span className="status-dot" />
              Development
            </span>

            <div className="avatar">IS</div>
          </div>
        </header>

        {activePage === "Overview" && (
          <Overview onNavigate={setActivePage} />
        )}

        {activePage === "Analyze Image" && (
          <AnalyzeImage
            onImageSelected={resetImageReportData}
            onAnalysisResult={(result) => {
              updateReportData({
                filename: result.filename,
                size_bytes: result.size_bytes,
                sha256: result.sha256,
                metadata: result.metadata,
              });
            }}
            onELAResult={(result) =>
              updateReportData({ ela: result })
            }
            onNoiseResult={(result) =>
              updateReportData({ noise: result })
            }
            onCopyMoveResult={(result) =>
              updateReportData({ copyMove: result })
            }
          />
        )}

        {activePage === "Compare Images" && (
          <CompareImages
            onComparisonResult={(result) => {
              updateReportData({
                filename:
                  result && reportData.filename === "ImageSleuth_Analysis"
                    ? result.filename_a
                    : reportData.filename,
                comparison: result,
              });
            }}
          />
        )}

        {activePage === "Analysis History" && (
          <AnalysisHistory />
        )}

        {activePage === "Reports" && (
          <ReportsPage reportData={reportData} />
        )}
      </main>
    </div>
  );
}

/* =========================================
   OVERVIEW DASHBOARD
========================================= */

function Overview({
  onNavigate,
}: {
  onNavigate: (page: Page) => void;
}) {
  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <p className="eyebrow">DIGITAL IMAGE FORENSICS</p>

          <h2>Investigate. Verify. Understand.</h2>

          <p className="welcome-description">
            Examine image metadata, verify file integrity, and
            investigate potential indicators of digital image
            manipulation using image-forensic techniques.
          </p>

          <button
            className="primary-button"
            onClick={() => onNavigate("Analyze Image")}
          >
            + Start New Analysis
          </button>
        </div>

        <div className="welcome-graphic">
          <div className="scan-frame">
            <span className="scan-corner top-left" />
            <span className="scan-corner top-right" />
            <span className="scan-corner bottom-left" />
            <span className="scan-corner bottom-right" />

            <div className="scan-circle">IS</div>
            <div className="scan-line" />
          </div>

          <p>IMAGE ANALYSIS WORKSPACE</p>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <h3>Analysis Workspace</h3>
          <p>Tools available for forensic examination</p>
        </div>

        <span className="tool-count">6 TOOLS</span>
      </div>

      <section className="tool-grid">
        <ToolCard
          icon="⌕"
          title="Metadata Analysis"
          description="Inspect image properties, dimensions, and available EXIF metadata."
          onClick={() => onNavigate("Analyze Image")}
        />

        <ToolCard
          icon="#"
          title="Integrity Verification"
          description="Calculate SHA-256 hashes to identify exact file contents and compare them with trusted reference hashes."
          onClick={() => onNavigate("Analyze Image")}
        />

        <ToolCard
          icon="◈"
          title="Error Level Analysis"
          description="Examine amplified JPEG recompression differences for potential anomalies."
          onClick={() => onNavigate("Analyze Image")}
        />

        <ToolCard
          icon="≋"
          title="Noise Residual Analysis"
          description="Visualize high-frequency differences between an image and its smoothed version."
          onClick={() => onNavigate("Analyze Image")}
        />

        <ToolCard
          icon="⌘"
          title="Copy-Move Detection"
          description="Identify candidate matching image features that may indicate duplicated regions."
          onClick={() => onNavigate("Analyze Image")}
        />

        <ToolCard
          icon="◫"
          title="Image Comparison"
          description="Compare two images using pixel differences, MAE, SSIM, and a difference map."
          onClick={() => onNavigate("Compare Images")}
        />
      </section>

      <section className="notice-card">
        <div className="notice-icon">i</div>

        <div>
          <h4>Forensic interpretation matters</h4>

          <p>
            ELA, noise residuals, and feature matches are investigative
            indicators, not proof of manipulation. SHA-256 identifies
            exact file contents but does not establish image authenticity.
            Interpret all results alongside other evidence.
          </p>
        </div>
      </section>

      <PageFooter />
    </div>
  );
}

function ToolCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button className="tool-card" onClick={onClick}>
      <div className="tool-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{description}</p>
      <span className="tool-link">Open tool →</span>
    </button>
  );
}

/* =========================================
   IMAGE ANALYSIS
========================================= */

function AnalyzeImage({
  onImageSelected,
  onAnalysisResult,
  onELAResult,
  onNoiseResult,
  onCopyMoveResult,
}: {
  onImageSelected: (filename: string, sizeBytes: number) => void;
  onAnalysisResult: (result: AnalysisResult) => void;
  onELAResult: (result: ELAResult | null) => void;
  onNoiseResult: (result: NoiseResult | null) => void;
  onCopyMoveResult: (result: CopyMoveResult | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [elaResult, setElaResult] = useState<ELAResult | null>(null);
  const [elaLoading, setElaLoading] = useState(false);
  const [elaError, setElaError] = useState("");
  const [elaQuality, setElaQuality] = useState(90);

  const [noiseResult, setNoiseResult] = useState<NoiseResult | null>(null);
  const [noiseLoading, setNoiseLoading] = useState(false);
  const [noiseError, setNoiseError] = useState("");

  const [copyMoveResult, setCopyMoveResult] =
    useState<CopyMoveResult | null>(null);

  const [copyMoveLoading, setCopyMoveLoading] = useState(false);
  const [copyMoveError, setCopyMoveError] = useState("");

  function handleFileSelection(selectedFile: File | null) {
    setFile(selectedFile);

    setResult(null);
    setError("");

    setElaResult(null);
    setElaError("");

    setNoiseResult(null);
    setNoiseError("");

    setCopyMoveResult(null);
    setCopyMoveError("");

    onELAResult(null);
    onNoiseResult(null);
    onCopyMoveResult(null);

    onImageSelected(
      selectedFile?.name ?? "ImageSleuth_Analysis",
      selectedFile?.size ?? 0
    );
  }

  async function handleAnalysis() {
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const analysis = await analyzeImage(file);

      setResult(analysis);
      onAnalysisResult(analysis);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Image analysis failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleELA() {
    if (!file) {
      setElaError("Please select a JPEG image first.");
      return;
    }

    if (!/\.(jpe?g)$/i.test(file.name)) {
      setElaError("ELA currently supports JPEG images only.");
      return;
    }

    setElaLoading(true);
    setElaError("");
    setElaResult(null);
    onELAResult(null);

    try {
      const analysis = await performELA(file, elaQuality);

      setElaResult(analysis);
      onELAResult(analysis);
    } catch (err) {
      setElaError(
        err instanceof Error ? err.message : "ELA analysis failed."
      );
    } finally {
      setElaLoading(false);
    }
  }

  async function handleNoiseAnalysis() {
    if (!file) {
      setNoiseError("Please select an image first.");
      return;
    }

    setNoiseLoading(true);
    setNoiseError("");
    setNoiseResult(null);
    onNoiseResult(null);

    try {
      const analysis = await analyzeNoise(file);

      setNoiseResult(analysis);
      onNoiseResult(analysis);
    } catch (err) {
      setNoiseError(
        err instanceof Error
          ? err.message
          : "Noise residual analysis failed."
      );
    } finally {
      setNoiseLoading(false);
    }
  }

  async function handleCopyMoveAnalysis() {
    if (!file) {
      setCopyMoveError("Please select an image first.");
      return;
    }

    setCopyMoveLoading(true);
    setCopyMoveError("");
    setCopyMoveResult(null);
    onCopyMoveResult(null);

    try {
      const analysis = await detectCopyMove(file);

      setCopyMoveResult(analysis);
      onCopyMoveResult(analysis);
    } catch (err) {
      setCopyMoveError(
        err instanceof Error
          ? err.message
          : "Copy-move analysis failed."
      );
    } finally {
      setCopyMoveLoading(false);
    }
  }

  return (
    <div className="page-content">
      <section className="page-intro">
        <p className="eyebrow">FORENSIC EXAMINATION</p>
        <h2>Analyze an Image</h2>

        <p>
          Upload an image to inspect metadata, calculate its SHA-256
          hash, and examine ELA, noise residuals, and copy-move feature
          matches.
        </p>
      </section>

      <section className="upload-card">
        <div className="upload-icon">↑</div>
        <h3>Upload Evidence Image</h3>
        <p>Select a JPEG or PNG image to begin.</p>

        <label className="upload-button">
          Select Image

          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            hidden
            onChange={(event) => {
              handleFileSelection(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
        </label>

        {file && (
          <div className="selected-file">
            <strong>Selected file:</strong> {file.name}
            <p>{(file.size / 1024).toFixed(2)} KB</p>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <button
            className="primary-button"
            onClick={handleAnalysis}
            disabled={!file || loading}
          >
            {loading ? "Analyzing Image..." : "Analyze Image"}
          </button>
        </div>

        {loading && (
          <p className="loading-message">
            Extracting metadata and calculating SHA-256...
          </p>
        )}

        {error && (
          <ErrorMessage title="Analysis failed" message={error} />
        )}
      </section>

      {/* ERROR LEVEL ANALYSIS */}

      <section className="ela-panel">
        <SectionHeading
          title="Error Level Analysis"
          description="Examine amplified JPEG recompression differences."
          badge="ELA"
        />

        <div className="ela-controls">
          <label htmlFor="ela-quality">
            JPEG quality: <strong>{elaQuality}</strong>
          </label>

          <select
            id="ela-quality"
            value={elaQuality}
            onChange={(event) => {
              setElaQuality(Number(event.target.value));
              setElaResult(null);
              setElaError("");
              onELAResult(null);
            }}
          >
            <option value={70}>70</option>
            <option value={80}>80</option>
            <option value={90}>90</option>
            <option value={95}>95</option>
          </select>

          <button
            className="primary-button"
            onClick={handleELA}
            disabled={!file || elaLoading}
          >
            {elaLoading ? "Generating ELA..." : "Run ELA"}
          </button>
        </div>

        {!file && <UploadHint>Select a JPEG image above to enable ELA.</UploadHint>}

        {elaLoading && (
          <p className="loading-message">
            Generating ELA visualization...
          </p>
        )}

        {elaError && <ErrorMessage title="ELA failed" message={elaError} />}

        {elaResult && (
          <VisualizationResult
            title="ELA Visualization"
            image={`data:image/png;base64,${elaResult.ela_image}`}
            alt="Error Level Analysis visualization"
            filename={elaResult.filename}
            interpretation={elaResult.interpretation}
          />
        )}
      </section>

      {/* NOISE ANALYSIS */}

      <section className="ela-panel">
        <SectionHeading
          title="Noise Residual Analysis"
          description="Visualize differences between the original image and its smoothed version."
          badge="NOISE"
        />

        <div className="ela-controls">
          <button
            className="primary-button"
            onClick={handleNoiseAnalysis}
            disabled={!file || noiseLoading}
          >
            {noiseLoading ? "Analyzing Noise..." : "Run Noise Analysis"}
          </button>
        </div>

        {!file && (
          <UploadHint>
            Select an image above to enable noise residual analysis.
          </UploadHint>
        )}

        {noiseLoading && (
          <p className="loading-message">
            Generating noise residual visualization...
          </p>
        )}

        {noiseError && (
          <ErrorMessage title="Noise analysis failed" message={noiseError} />
        )}

        {noiseResult && (
          <VisualizationResult
            title="Noise Residual Visualization"
            image={`data:image/png;base64,${noiseResult.noise_image}`}
            alt="Noise residual visualization"
            filename={noiseResult.filename}
            interpretation={noiseResult.interpretation}
          />
        )}
      </section>

      {/* COPY-MOVE DETECTION */}

      <section className="ela-panel">
        <SectionHeading
          title="Copy-Move Detection"
          description="Identify candidate matching features in different regions of the same image."
          badge="SIFT"
        />

        <div className="ela-controls">
          <button
            className="primary-button"
            onClick={handleCopyMoveAnalysis}
            disabled={!file || copyMoveLoading}
          >
            {copyMoveLoading
              ? "Detecting Matches..."
              : "Run Copy-Move Detection"}
          </button>
        </div>

        {!file && (
          <UploadHint>
            Select an image above to enable copy-move detection.
          </UploadHint>
        )}

        {copyMoveLoading && (
          <p className="loading-message">
            Detecting and matching image features...
          </p>
        )}

        {copyMoveError && (
          <ErrorMessage
            title="Copy-move analysis failed"
            message={copyMoveError}
          />
        )}

        {copyMoveResult && (
          <div className="ela-results">
            <h4>Feature Matching Visualization</h4>

            <img
              className="ela-image"
              src={`data:image/png;base64,${copyMoveResult.visualization}`}
              alt="Copy-move feature matching visualization"
            />

            <p className="ela-caption">
              Original image: {copyMoveResult.filename}
            </p>

            <div className="results-grid">
              <ResultCard
                label="Keypoints Detected"
                value={String(copyMoveResult.keypoints_detected)}
              />

              <ResultCard
                label="Candidate Matches"
                value={String(copyMoveResult.candidate_matches)}
              />

              <ResultCard
                label="Preliminary Indicator"
                value={
                  copyMoveResult.potential_copy_move
                    ? "Potential matches"
                    : "No strong indicator"
                }
              />
            </div>

            <InterpretationNotice
              text={copyMoveResult.interpretation}
            >
              Similar features can occur naturally in repeated patterns,
              textures, or objects. Candidate matches require further
              examination and do not independently establish manipulation.
            </InterpretationNotice>
          </div>
        )}
      </section>

      {/* METADATA AND INTEGRITY RESULTS */}

      {result && (
        <section className="results-section">
          <SectionHeading
            title="Forensic Analysis Results"
            description={result.message}
            badge={result.analysis_status.toUpperCase()}
          />

          <div className="results-grid">
            <ResultCard
              label="Image Format"
              value={result.metadata.format ?? "Unknown"}
            />

            <ResultCard
              label="Image Dimensions"
              value={`${result.metadata.width} × ${result.metadata.height}`}
            />

            <ResultCard
              label="File Size"
              value={`${(result.size_bytes / 1024).toFixed(2)} KB`}
            />

            <ResultCard
              label="Color Mode"
              value={result.metadata.mode}
            />
          </div>

          <div className="result-card full-width">
            <h4>File Information</h4>

            <div className="metadata-table">
              <MetadataRow label="Filename" value={result.filename} />

              <MetadataRow
                label="File Size"
                value={`${result.size_bytes.toLocaleString()} bytes`}
              />

              <MetadataRow
                label="Format"
                value={result.metadata.format ?? "Unknown"}
              />

              <MetadataRow
                label="Dimensions"
                value={`${result.metadata.width} × ${result.metadata.height}`}
              />
            </div>
          </div>

          <div className="result-card full-width">
            <h4>SHA-256 Integrity Hash</h4>

            <p>
              This hash identifies the exact file contents. Comparing
              it with a trusted reference hash can help verify file
              integrity.
            </p>

            <code className="hash-value">{result.sha256}</code>
          </div>

          <div className="result-card full-width">
            <h4>EXIF Metadata</h4>

            {Object.keys(result.metadata.exif).length > 0 ? (
              <div className="metadata-table">
                {Object.entries(result.metadata.exif).map(
                  ([key, value]) => (
                    <MetadataRow
                      key={key}
                      label={key}
                      value={value}
                    />
                  )
                )}
              </div>
            ) : (
              <p>No EXIF metadata was found in this image.</p>
            )}
          </div>

          <InterpretationNotice>
            Metadata extraction and SHA-256 calculation do not
            independently establish whether an image has been
            manipulated. Additional forensic examination and contextual
            evidence are required for reliable conclusions.
          </InterpretationNotice>
        </section>
      )}

      <PageFooter />
    </div>
  );
}

/* =========================================
   IMAGE COMPARISON
========================================= */

function CompareImages({
  onComparisonResult,
}: {
  onComparisonResult: (
    result: ImageComparisonResult | null
  ) => void;
}) {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  const [result, setResult] =
    useState<ImageComparisonResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleComparison() {
    if (!fileA || !fileB) {
      setError("Please select both images before comparing.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    onComparisonResult(null);

    try {
      const comparison = await compareImages(fileA, fileB);

      setResult(comparison);
      onComparisonResult(comparison);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Image comparison failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <section className="page-intro">
        <p className="eyebrow">COMPARATIVE ANALYSIS</p>
        <h2>Compare Images</h2>

        <p>
          Compare two images using pixel-level differences,
          Mean Absolute Error, and Structural Similarity Index.
        </p>
      </section>

      <div className="comparison-grid">
        <ImageSlot
          label="Image A"
          file={fileA}
          onSelect={(selectedFile) => {
            setFileA(selectedFile);
            setResult(null);
            onComparisonResult(null);
            setError("");
          }}
        />

        <ImageSlot
          label="Image B"
          file={fileB}
          onSelect={(selectedFile) => {
            setFileB(selectedFile);
            setResult(null);
            onComparisonResult(null);
            setError("");
          }}
        />
      </div>

      <div className="ela-controls">
        <button
          className="primary-button"
          onClick={handleComparison}
          disabled={!fileA || !fileB || loading}
        >
          {loading ? "Comparing Images..." : "Compare Images"}
        </button>
      </div>

      {loading && (
        <p className="loading-message">
          Calculating pixel differences and structural similarity...
        </p>
      )}

      {error && (
        <ErrorMessage title="Comparison failed" message={error} />
      )}

      {result && (
        <section className="results-section">
          <SectionHeading
            title="Comparison Results"
            description={`${result.filename_a} compared with ${result.filename_b}`}
            badge={result.analysis_status.toUpperCase()}
          />

          <div className="comparison-grid">
            <div className="result-card">
              <h4>Image A</h4>
              <p>{result.filename_a}</p>

              <p>
                {result.dimensions_a.width} × {result.dimensions_a.height}
              </p>

              {fileA && (
                <img
                  className="ela-image"
                  src={URL.createObjectURL(fileA)}
                  alt="First image selected for comparison"
                />
              )}
            </div>

            <div className="result-card">
              <h4>Image B</h4>
              <p>{result.filename_b}</p>

              <p>
                {result.dimensions_b.width} × {result.dimensions_b.height}
              </p>

              {fileB && (
                <img
                  className="ela-image"
                  src={URL.createObjectURL(fileB)}
                  alt="Second image selected for comparison"
                />
              )}
            </div>
          </div>

          <div className="results-grid">
            <ResultCard
              label="Mean Absolute Error (MAE)"
              value={result.mae.toFixed(4)}
            />

            <ResultCard
              label="Structural Similarity (SSIM)"
              value={result.ssim.toFixed(4)}
            />

            <ResultCard
              label="Structural Similarity Percentage"
              value={`${result.similarity_percentage.toFixed(2)}%`}
            />
          </div>

          {result.resized_for_comparison && (
            <InterpretationNotice>
              The images have different dimensions. One image was resized
              to enable comparison. Resizing can affect pixel differences
              and similarity scores.
            </InterpretationNotice>
          )}

          <div className="result-card full-width">
            <h4>Pixel Difference Map</h4>

            <p>
              This heatmap visualizes pixel-level differences between
              the two images. Intense regions generally represent
              larger differences.
            </p>

            <img
              className="ela-image"
              src={`data:image/png;base64,${result.difference_map}`}
              alt="Pixel difference heatmap"
            />
          </div>

          <InterpretationNotice text={result.interpretation}>
            Higher SSIM values indicate greater structural similarity,
            while lower MAE values indicate smaller average pixel
            differences. These metrics do not independently determine
            whether an image has been manipulated.
          </InterpretationNotice>
        </section>
      )}

      <PageFooter />
    </div>
  );
}

/* =========================================
   IMAGE UPLOAD SLOT
========================================= */

function ImageSlot({
  label,
  file,
  onSelect,
}: {
  label: string;
  file: File | null;
  onSelect: (file: File | null) => void;
}) {
  return (
    <label className="image-slot">
      <div className="upload-icon">↑</div>
      <h3>{label}</h3>

      <p>{file ? file.name : "Select an image to compare"}</p>

      {file && <p>{(file.size / 1024).toFixed(2)} KB</p>}

      <span className="secondary-button">Browse Files</span>

      <input
        type="file"
        accept=".jpg,.jpeg,.png"
        hidden
        onChange={(event) => {
          onSelect(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
    </label>
  );
}

/* =========================================
   REPORTS PAGE
========================================= */

function ReportsPage({
  reportData,
}: {
  reportData: SharedReportData;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const availableAnalyses = [
    reportData.metadata && "Metadata and SHA-256",
    reportData.ela && "Error Level Analysis",
    reportData.noise && "Noise Residual Analysis",
    reportData.copyMove && "Copy-Move Detection",
    reportData.comparison && "Image Comparison",
  ].filter(Boolean) as string[];

  const canGenerateReport = availableAnalyses.length > 0;

  async function handleGenerateReport() {
    if (!canGenerateReport) {
      setError(
        "Run at least one forensic analysis before generating a report."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const metadata = reportData.metadata;

    const request: ForensicReportRequest = {
      report_id: `IS-${Date.now()}`,
      filename: reportData.filename,
      size_bytes: reportData.size_bytes,
      sha256: reportData.sha256,

      metadata: {
        format: metadata?.format ?? null,
        width: metadata?.width ?? 0,
        height: metadata?.height ?? 0,
        mode: metadata?.mode ?? "Unknown",
        exif: metadata?.exif ?? {},
      },

      ...(reportData.ela ? { ela: { ...reportData.ela } } : {}),

      ...(reportData.noise ? { noise: { ...reportData.noise } } : {}),

      ...(reportData.copyMove
        ? { copy_move: { ...reportData.copyMove } }
        : {}),

      ...(reportData.comparison
        ? { comparison: { ...reportData.comparison } }
        : {}),
    };

    try {
      await downloadForensicReport(request);

      setSuccess(
        "Your forensic PDF report has been generated and downloaded successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate the forensic report."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <section className="page-intro">
        <p className="eyebrow">FORENSIC DOCUMENTATION</p>
        <h2>Forensic Reports</h2>

        <p>
          Generate a downloadable PDF containing the forensic results
          collected during your current ImageSleuth session.
        </p>
      </section>

      <section className="result-card full-width">
        <SectionHeading
          title="Report Summary"
          description="Review the information available for your report."
          badge={`${availableAnalyses.length} ANALYSES`}
        />

        <div className="metadata-table">
          <MetadataRow
            label="Report ID"
            value={`IS-${new Date().getFullYear()}-SESSION`}
          />

          <MetadataRow label="Image" value={reportData.filename} />

          <MetadataRow
            label="File Size"
            value={
              reportData.size_bytes > 0
                ? `${(reportData.size_bytes / 1024).toFixed(2)} KB`
                : "Not available"
            }
          />

          <MetadataRow
            label="SHA-256"
            value={reportData.sha256 || "Not calculated"}
          />
        </div>
      </section>

      <section className="result-card full-width">
        <h3>Included Analysis Results</h3>

        {availableAnalyses.length > 0 ? (
          <div className="report-feature-list">
            {availableAnalyses.map((analysis) => (
              <div key={analysis} className="metadata-row">
                <span>{analysis}</span>
                <strong>Available</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="upload-icon">▤</div>
            <h3>No analysis results available</h3>

            <p>
              Go to Analyze Image or Compare Images and complete at
              least one analysis before generating a PDF.
            </p>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button
            className="primary-button"
            onClick={handleGenerateReport}
            disabled={!canGenerateReport || loading}
          >
            {loading
              ? "Generating PDF Report..."
              : "Download Forensic PDF Report"}
          </button>
        </div>

        {loading && (
          <p className="loading-message" role="status">
            Sending forensic results to the report generator...
          </p>
        )}

        {error && (
          <ErrorMessage
            title="Report generation failed"
            message={error}
          />
        )}

        {success && (
          <div className="notice-card" role="status">
            <div className="notice-icon">✓</div>

            <div>
              <h4>Report generated successfully</h4>
              <p>{success}</p>
            </div>
          </div>
        )}
      </section>

      <InterpretationNotice>
        The PDF contains results available in the current browser
        session. Only completed analyses shared with the Reports page
        are included. The report records forensic indicators and
        metrics; it does not independently establish authenticity or
        prove manipulation.
      </InterpretationNotice>

      <PageFooter />
    </div>
  );
}

/* =========================================
   ANALYSIS HISTORY
========================================= */

function AnalysisHistory() {
  const [records, setRecords] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedRecord, setSelectedRecord] =
    useState<AnalysisHistoryDetail | null>(null);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  async function loadHistory() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const history = await getAnalysisHistory(50, 0);
      setRecords(history);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load analysis history."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function handleViewDetails(id: number) {
    setDetailsLoading(true);
    setDetailsError("");
    setSelectedRecord(null);

    try {
      const record = await getAnalysisById(id);
      setSelectedRecord(record);
    } catch (err) {
      setDetailsError(
        err instanceof Error
          ? err.message
          : "Unable to load analysis details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "Delete this analysis record permanently?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError("");
    setNotice("");

    try {
      await deleteAnalysis(id);

      setRecords((previous) =>
        previous.filter((record) => record.id !== id)
      );

      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }

      setNotice(`Analysis record #${id} was deleted.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete the analysis record."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(value: string) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatAnalysisType(value: string) {
    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  return (
    <div className="page-content">
      <section className="page-intro">
        <p className="eyebrow">FORENSIC WORKSPACE</p>
        <h2>Analysis History</h2>

        <p>
          Review previous forensic analyses stored in the local
          SQLite database. Open individual records to inspect their
          saved results or delete records that are no longer needed.
        </p>
      </section>

      <div className="results-grid">
        <ResultCard
          label="Saved Records"
          value={String(records.length)}
        />

        <ResultCard label="Storage" value="SQLite" />

        <ResultCard
          label="Records Displayed"
          value={loading ? "Loading..." : `${records.length} / 50`}
        />
      </div>

      <section className="result-card full-width">
        <SectionHeading
          title="Previous Analyses"
          description="The latest 50 records returned by the backend."
          badge={`${records.length} RECORDS`}
        />

        <div style={{ marginBottom: 20 }}>
          <button
            className="secondary-button"
            onClick={() => void loadHistory()}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh History"}
          </button>
        </div>

        {loading && (
          <p className="loading-message" role="status">
            Loading saved analysis records...
          </p>
        )}

        {error && (
          <ErrorMessage
            title="History operation failed"
            message={error}
          />
        )}

        {notice && (
          <div className="notice-card" role="status">
            <div className="notice-icon">✓</div>

            <div>
              <h4>Operation completed</h4>
              <p>{notice}</p>
            </div>
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="empty-state">
            <div className="upload-icon">◷</div>
            <h3>No Analysis History</h3>

            <p>
              No records were returned. Analyze an image using the
              Analyze Image page, then refresh this page.
            </p>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Filename</th>
                  <th>Analysis Type</th>
                  <th>Dimensions</th>
                  <th>File Size</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>#{record.id}</td>

                    <td className="history-filename">
                      {record.filename}
                    </td>

                    <td>
                      {formatAnalysisType(record.analysis_type)}
                    </td>

                    <td>
                      {record.width > 0 && record.height > 0
                        ? `${record.width} × ${record.height}`
                        : "N/A"}
                    </td>

                    <td>{formatFileSize(record.file_size)}</td>

                    <td>
                      <span
                        className={`history-status ${
                          record.status.toLowerCase() === "completed"
                            ? "completed"
                            : "other"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>

                    <td>{formatDate(record.created_at)}</td>

                    <td>
                      <div className="history-actions">
                        <button
                          className="secondary-button"
                          onClick={() =>
                            void handleViewDetails(record.id)
                          }
                          disabled={detailsLoading}
                        >
                          View
                        </button>

                        <button
                          className="history-delete-button"
                          onClick={() =>
                            void handleDelete(record.id)
                          }
                          disabled={deletingId === record.id}
                        >
                          {deletingId === record.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(detailsLoading || detailsError || selectedRecord) && (
        <section className="result-card full-width">
          <SectionHeading
            title="Analysis Details"
            description="Saved information retrieved from SQLite."
            badge={
              selectedRecord
                ? `RECORD #${selectedRecord.id}`
                : "DETAILS"
            }
          />

          {detailsLoading && (
            <p className="loading-message" role="status">
              Retrieving analysis details...
            </p>
          )}

          {detailsError && (
            <ErrorMessage
              title="Unable to load details"
              message={detailsError}
            />
          )}

          {selectedRecord && (
            <>
              <div className="metadata-table">
                <MetadataRow
                  label="Record ID"
                  value={String(selectedRecord.id)}
                />

                <MetadataRow
                  label="Filename"
                  value={selectedRecord.filename}
                />

                <MetadataRow
                  label="Analysis Type"
                  value={formatAnalysisType(
                    selectedRecord.analysis_type
                  )}
                />

                <MetadataRow
                  label="Status"
                  value={selectedRecord.status}
                />

                <MetadataRow
                  label="Created At"
                  value={formatDate(selectedRecord.created_at)}
                />

                <MetadataRow
                  label="Image Format"
                  value={selectedRecord.image_format ?? "Unknown"}
                />

                <MetadataRow
                  label="Dimensions"
                  value={
                    selectedRecord.width > 0 &&
                    selectedRecord.height > 0
                      ? `${selectedRecord.width} × ${selectedRecord.height}`
                      : "Not available"
                  }
                />

                <MetadataRow
                  label="File Size"
                  value={formatFileSize(selectedRecord.file_size)}
                />
              </div>

              <h4 style={{ marginTop: 24 }}>
                SHA-256 Integrity Hash
              </h4>

              <code className="hash-value">
                {selectedRecord.sha256 || "Not available"}
              </code>

              <h4 style={{ marginTop: 24 }}>
                Saved Analysis Results
              </h4>

              <pre className="history-json">
                {JSON.stringify(
                  selectedRecord.results ??
                    selectedRecord.results_json ??
                    {},
                  null,
                  2
                )}
              </pre>

              <InterpretationNotice>
                These details represent the results stored by
                ImageSleuth. They are not independent proof that an
                image is authentic or manipulated.
              </InterpretationNotice>

              <button
                className="secondary-button"
                onClick={() => setSelectedRecord(null)}
              >
                Close Details
              </button>
            </>
          )}
        </section>
      )}

      <PageFooter />
    </div>
  );
}

/* =========================================
   SHARED UI COMPONENTS
========================================= */

function SectionHeading({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <span className="tool-count">{badge}</span>
    </div>
  );
}

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="result-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetadataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="metadata-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ErrorMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="result-error" role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function UploadHint({ children }: { children: string }) {
  return <p className="upload-hint">{children}</p>;
}

function VisualizationResult({
  title,
  image,
  alt,
  filename,
  interpretation,
}: {
  title: string;
  image: string;
  alt: string;
  filename: string;
  interpretation: string;
}) {
  return (
    <div className="ela-results">
      <h4>{title}</h4>

      <img className="ela-image" src={image} alt={alt} />

      <p className="ela-caption">
        Original image: {filename}
      </p>

      <InterpretationNotice text={interpretation} />
    </div>
  );
}

function InterpretationNotice({
  children,
  text,
}: {
  children?: string;
  text?: string;
}) {
  return (
    <section className="notice-card">
      <div className="notice-icon">i</div>

      <div>
        <h4>Interpretation</h4>
        <p>{text ?? children}</p>
      </div>
    </section>
  );
}

function PageFooter() {
  return (
    <footer className="page-footer">
      ImageSleuth · Digital Image Forensics and Manipulation Analysis Tool
    </footer>
  );
}

/* =========================================
   LEGACY PLACEHOLDER
   Retained for any future unfinished pages
========================================= */

function Placeholder({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="page-content">
      <section className="page-intro">
        <p className="eyebrow">FORENSIC WORKSPACE</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </section>

      <section className="empty-state">
        <div className="upload-icon">{icon}</div>
        <h2>Feature Under Development</h2>
        <p>{description}</p>
      </section>
    </div>
  );
}

export default App;