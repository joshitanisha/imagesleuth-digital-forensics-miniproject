import base64
import json
import os
import tempfile
from datetime import datetime, timezone
from io import BytesIO

import cv2
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

from backend.app.database.history import (
    initialize_database,
    save_analysis,
    get_analysis_history,
    get_analysis_by_id,
    delete_analysis,
)

from backend.app.forensic.metadata import analyze_metadata
from backend.app.forensic.integrity import calculate_sha256
from backend.app.forensic.ela import perform_ela
from backend.app.forensic.noise import analyze_noise
from backend.app.forensic.copy_move import detect_copy_move
from backend.app.forensic.image_comparison import compare_images
from backend.app.forensic.report_generator import generate_forensic_report


# ==================================================
# FASTAPI APPLICATION
# ==================================================

app = FastAPI(
    title="ImageSleuth API",
    description="Digital Image Forensics and Manipulation Analysis Tool",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@app.on_event("startup")
def startup_event():
    """Initialize the SQLite database when the API starts."""
    initialize_database()


# ==================================================
# DATABASE HELPER
# ==================================================

def record_analysis(
    filename: str,
    analysis_type: str,
    results: dict,
    file_size: int = 0,
    sha256: str = "",
    image_format: str | None = None,
    width: int = 0,
    height: int = 0,
) -> dict:
    """Save a completed analysis to SQLite."""

    return save_analysis(
        filename=filename,
        file_size=file_size,
        sha256=sha256,
        image_format=image_format,
        width=width,
        height=height,
        analysis_type=analysis_type,
        status="completed",
        results_json=json.dumps(results, default=str),
    )


# ==================================================
# HELPER: SAVE AND VALIDATE AN UPLOADED IMAGE
# ==================================================

async def save_uploaded_image(file: UploadFile):
    """
    Validate and temporarily save an uploaded image.

    Returns:
        temp_path: Temporary file path.
        contents: Original uploaded bytes.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required.",
        )

    contents = await file.read(MAX_FILE_SIZE + 1)

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 10 MB upload limit.",
        )

    suffix = os.path.splitext(file.filename)[1][:10] or ".img"
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name

        try:
            with Image.open(temp_path) as image:
                image.verify()

        except (UnidentifiedImageError, OSError) as error:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid supported image.",
            ) from error

        return temp_path, contents

    except Exception:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise


# ==================================================
# HELPER: SAVE ANALYSIS WITH ERROR ISOLATION
# ==================================================

def persist_analysis_safely(**kwargs):
    """
    Save an analysis without turning a successful forensic result
    into an API failure if the history database is temporarily unavailable.
    """
    try:
        record_analysis(**kwargs)
    except Exception:
        # The forensic result can still be returned to the user.
        # The database issue can be diagnosed from server logs if needed.
        import logging
        logging.getLogger("imagesleuth").exception(
            "Could not save analysis to SQLite history."
        )


# ==================================================
# ROOT ENDPOINT
# ==================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to ImageSleuth API",
        "status": "running",
    }


# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "ImageSleuth",
        "database": "SQLite",
    }


# ==================================================
# ENDPOINT 1: METADATA AND SHA-256 ANALYSIS
# ==================================================

@app.post("/api/analyze")
async def analyze_image(file: UploadFile = File(...)):
    temp_path = None

    try:
        temp_path, contents = await save_uploaded_image(file)

        metadata = analyze_metadata(temp_path)
        metadata["filename"] = os.path.basename(file.filename)

        sha256 = calculate_sha256(temp_path)

        response_data = {
            "filename": os.path.basename(file.filename),
            "size_bytes": len(contents),
            "sha256": sha256,
            "metadata": metadata,
            "analysis_status": "completed",
            "message": (
                "Metadata extraction and SHA-256 calculation completed."
            ),
        }

        persist_analysis_safely(
            filename=response_data["filename"],
            analysis_type="Metadata and SHA-256",
            results=response_data,
            file_size=len(contents),
            sha256=sha256,
            image_format=metadata.get("format"),
            width=metadata.get("width", 0),
            height=metadata.get("height", 0),
        )

        return response_data

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Image analysis failed: {type(error).__name__}",
        ) from error

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        await file.close()


# ==================================================
# ENDPOINT 2: ERROR LEVEL ANALYSIS
# ==================================================

@app.post("/api/ela")
async def analyze_image_ela(
    file: UploadFile = File(...),
    quality: int = Query(default=90, ge=1, le=95),
):
    temp_path = None

    try:
        temp_path, contents = await save_uploaded_image(file)

        try:
            with Image.open(temp_path) as image:
                if image.format != "JPEG":
                    raise HTTPException(
                        status_code=400,
                        detail="ELA currently supports JPEG images only.",
                    )

        except HTTPException:
            raise

        except (UnidentifiedImageError, OSError) as error:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid JPEG image.",
            ) from error

        ela_image = perform_ela(
            temp_path,
            quality=quality,
        )

        output_buffer = BytesIO()
        ela_image.save(output_buffer, format="PNG")

        encoded_image = base64.b64encode(
            output_buffer.getvalue()
        ).decode("utf-8")

        response_data = {
            "filename": os.path.basename(file.filename),
            "analysis_type": "Error Level Analysis",
            "jpeg_quality": quality,
            "ela_image": encoded_image,
            "image_format": "PNG",
            "analysis_status": "completed",
            "interpretation": (
                "ELA highlights differences after JPEG recompression. "
                "These differences may result from editing, compression, "
                "or other image-processing operations. ELA alone cannot "
                "prove that an image has been manipulated."
            ),
        }

        persist_analysis_safely(
            filename=response_data["filename"],
            analysis_type="Error Level Analysis",
            results=response_data,
            file_size=len(contents),
            image_format="JPEG",
        )

        return response_data

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"ELA analysis failed: {type(error).__name__}",
        ) from error

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        await file.close()


# ==================================================
# ENDPOINT 3: NOISE RESIDUAL ANALYSIS
# ==================================================

@app.post("/api/noise")
async def analyze_image_noise(file: UploadFile = File(...)):
    temp_path = None

    try:
        temp_path, contents = await save_uploaded_image(file)

        residual = analyze_noise(temp_path)

        output_buffer = BytesIO()
        residual.save(output_buffer, format="PNG")

        encoded_image = base64.b64encode(
            output_buffer.getvalue()
        ).decode("utf-8")

        response_data = {
            "filename": os.path.basename(file.filename),
            "analysis_type": "Noise Residual Analysis",
            "noise_image": encoded_image,
            "image_format": "PNG",
            "analysis_status": "completed",
            "interpretation": (
                "This visualization shows amplified differences between "
                "the image and a smoothed version. Variations can result "
                "from texture, edges, compression, and processing. "
                "They are not proof of image manipulation."
            ),
        }

        persist_analysis_safely(
            filename=response_data["filename"],
            analysis_type="Noise Residual Analysis",
            results=response_data,
            file_size=len(contents),
        )

        return response_data

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Noise analysis failed: {type(error).__name__}",
        ) from error

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        await file.close()


# ==================================================
# ENDPOINT 4: COPY-MOVE DETECTION
# ==================================================

@app.post("/api/copy-move")
async def analyze_copy_move(file: UploadFile = File(...)):
    temp_path = None

    try:
        temp_path, contents = await save_uploaded_image(file)

        result = detect_copy_move(temp_path)

        success, encoded_image = cv2.imencode(
            ".png",
            result["visualization"],
        )

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Could not generate the detection visualization.",
            )

        image_base64 = base64.b64encode(
            encoded_image.tobytes()
        ).decode("utf-8")

        response_data = {
            "filename": os.path.basename(file.filename),
            "analysis_type": "Copy-Move Detection",
            "keypoints_detected": result["keypoints_detected"],
            "candidate_matches": result["candidate_matches"],
            "potential_copy_move": result["potential_copy_move"],
            "visualization": image_base64,
            "image_format": "PNG",
            "analysis_status": "completed",
            "interpretation": result["message"],
        }

        persist_analysis_safely(
            filename=response_data["filename"],
            analysis_type="Copy-Move Detection",
            results=response_data,
            file_size=len(contents),
        )

        return response_data

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Copy-move analysis failed: {type(error).__name__}",
        ) from error

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        await file.close()


# ==================================================
# ENDPOINT 5: IMAGE COMPARISON
# ==================================================

@app.post("/api/compare")
async def compare_uploaded_images(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
):
    path_a = None
    path_b = None
    contents_a = b""
    contents_b = b""

    try:
        path_a, contents_a = await save_uploaded_image(file_a)
        path_b, contents_b = await save_uploaded_image(file_b)

        result = compare_images(path_a, path_b)

        success, encoded_image = cv2.imencode(
            ".png",
            cv2.cvtColor(
                result["difference_map"],
                cv2.COLOR_RGB2BGR,
            ),
        )

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Could not generate the difference map.",
            )

        result["difference_map"] = base64.b64encode(
            encoded_image.tobytes()
        ).decode("utf-8")

        result["filename_a"] = os.path.basename(
            file_a.filename or "image_a"
        )
        result["filename_b"] = os.path.basename(
            file_b.filename or "image_b"
        )
        result["analysis_type"] = "Image Comparison"
        result["analysis_status"] = "completed"

        persist_analysis_safely(
            filename=(
                f"{result['filename_a']} vs {result['filename_b']}"
            ),
            analysis_type="Image Comparison",
            results=result,
            file_size=len(contents_a) + len(contents_b),
        )

        return result

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Image comparison failed: {type(error).__name__}",
        ) from error

    finally:
        for path in (path_a, path_b):
            if path and os.path.exists(path):
                os.remove(path)

        await file_a.close()
        await file_b.close()


# ==================================================
# REQUEST MODEL: PDF FORENSIC REPORT
# ==================================================

class ForensicReportRequest(BaseModel):
    report_id: str = Field(default="IS-REPORT")
    filename: str = Field(default="Unknown")
    analysis_date: str = Field(default="")
    size_bytes: int = Field(default=0, ge=0)

    sha256: str = Field(default="")

    metadata: dict = Field(default_factory=dict)
    ela: dict = Field(default_factory=dict)
    noise: dict = Field(default_factory=dict)
    copy_move: dict = Field(default_factory=dict)
    comparison: dict = Field(default_factory=dict)


# ==================================================
# ENDPOINT 6: PDF FORENSIC REPORT GENERATION
# ==================================================

@app.post("/api/report")
async def create_forensic_report(request: ForensicReportRequest):
    try:
        report_data = request.model_dump()

        if not report_data["analysis_date"]:
            report_data["analysis_date"] = (
                datetime.now(timezone.utc).strftime(
                    "%Y-%m-%d %H:%M:%S UTC"
                )
            )

        pdf_bytes = generate_forensic_report(report_data)

        safe_filename = (
            "".join(
                character
                for character in request.filename
                if character.isalnum() or character in "._-"
            )[:100]
            or "image"
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{safe_filename}_forensic_report.pdf"'
                )
            },
        )

    except Exception as error:
        import logging
        logging.getLogger("imagesleuth").exception(
            "PDF report generation failed."
        )

        raise HTTPException(
            status_code=500,
            detail="Could not generate the forensic report.",
        ) from error


# ==================================================
# ENDPOINT 7: LIST ANALYSIS HISTORY
# ==================================================

@app.get("/api/history")
def list_analysis_history(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    records = get_analysis_history(
        limit=limit,
        offset=offset,
    )

    return {
        "count": len(records),
        "records": records,
    }


# ==================================================
# ENDPOINT 8: GET ONE HISTORY RECORD
# ==================================================

@app.get("/api/history/{record_id}")
def retrieve_analysis_history(record_id: int):
    record = get_analysis_by_id(record_id)

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis history record not found.",
        )

    try:
        record["results"] = json.loads(
            record.pop("results_json", "{}")
        )
    except (TypeError, json.JSONDecodeError):
        record["results"] = {}

    return record


# ==================================================
# ENDPOINT 9: DELETE ONE HISTORY RECORD
# ==================================================

@app.delete("/api/history/{record_id}")
def remove_analysis_history(record_id: int):
    deleted = delete_analysis(record_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Analysis history record not found.",
        )

    return {
        "message": "Analysis history record deleted successfully.",
        "id": record_id,
    }