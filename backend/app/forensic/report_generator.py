import os
from datetime import datetime, timezone
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
)


def generate_forensic_report(data: dict) -> bytes:
    """
    Generate a PDF report from submitted forensic analysis results.
    Returns the PDF as bytes.
    """

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="ImageSleuth Forensic Analysis Report",
        author="ImageSleuth",
    )

    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="ReportTitle",
            parent=styles["Title"],
            alignment=TA_CENTER,
            fontSize=21,
            leading=27,
            textColor=colors.HexColor("#315DAD"),
            spaceAfter=8,
        )
    )

    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading2"],
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#315DAD"),
            spaceBefore=12,
            spaceAfter=7,
        )
    )

    styles.add(
        ParagraphStyle(
            name="SmallText",
            parent=styles["BodyText"],
            fontSize=8,
            leading=11,
            wordWrap="CJK",
        )
    )

    story = []

    def add_paragraph(text: str, style="BodyText"):
        story.append(Paragraph(escape(str(text)), styles[style]))
        story.append(Spacer(1, 4))

    def add_section(title: str):
        story.append(Paragraph(title, styles["SectionHeading"]))

    def add_table(rows):
        table = Table(rows, colWidths=[48 * mm, 112 * mm], repeatRows=1)

        table.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        colors.HexColor("#315DAD"),
                    ),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("LEADING", (0, 0), (-1, -1), 11),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D0D5DD")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )

        story.append(table)
        story.append(Spacer(1, 10))

    def add_image_from_base64(encoded: str, caption: str):
        import base64

        from reportlab.lib.utils import ImageReader

        try:
            image_bytes = base64.b64decode(encoded, validate=True)
            image_buffer = BytesIO(image_bytes)

            image_reader = ImageReader(image_buffer)
            image_width, image_height = image_reader.getSize()

            max_width = 155 * mm
            max_height = 105 * mm

            scale = min(
                max_width / image_width,
                max_height / image_height,
                1,
            )

            image = Image(
                image_buffer,
                width=image_width * scale,
                height=image_height * scale,
            )

            story.append(
                KeepTogether(
                    [
                        Paragraph(escape(caption), styles["Heading4"]),
                        Spacer(1, 4),
                        image,
                        Spacer(1, 10),
                    ]
                )
            )

        except Exception:
            add_paragraph(f"{caption}: visualization unavailable.")

    # Report heading
    story.append(Paragraph("ImageSleuth", styles["ReportTitle"]))

    story.append(
        Paragraph(
            "Digital Image Forensics and Manipulation Analysis",
            ParagraphStyle(
                "Subtitle",
                parent=styles["BodyText"],
                alignment=TA_CENTER,
                fontSize=10,
                textColor=colors.HexColor("#667085"),
            ),
        )
    )

    story.append(Spacer(1, 15))

    timestamp = datetime.now(timezone.utc).strftime(
        "%Y-%m-%d %H:%M:%S UTC"
    )

    metadata = data.get("metadata") or {}
    exif = metadata.get("exif") or {}

    # Case information
    add_section("1. Case Information")

    add_table(
        [
            ["Field", "Value"],
            ["Report ID", data.get("report_id", "Not provided")],
            ["Filename", data.get("filename", "Unknown")],
            ["Analysis Date", data.get("analysis_date", timestamp)],
            ["File Size", f'{data.get("size_bytes", "Unknown")} bytes'],
        ]
    )

    # Image metadata
    add_section("2. Image Metadata")

    add_table(
        [
            ["Property", "Value"],
            ["Format", metadata.get("format", "Unknown")],
            ["Width", metadata.get("width", "Unknown")],
            ["Height", metadata.get("height", "Unknown")],
            ["Color Mode", metadata.get("mode", "Unknown")],
        ]
    )

    if exif:
        add_section("3. EXIF Metadata")

        exif_rows = [["Property", "Value"]]

        for key, value in list(exif.items())[:100]:
            exif_rows.append([str(key), str(value)])

        add_table(exif_rows)

    # Integrity
    add_section("4. Integrity Verification")

    add_table(
        [
            ["Property", "Value"],
            ["SHA-256", data.get("sha256", "Not provided")],
        ]
    )

    # ELA
    ela = data.get("ela") or {}

    add_section("5. Error Level Analysis")

    if ela:
        add_table(
            [
                ["Property", "Value"],
                ["Status", ela.get("analysis_status", "Completed")],
                ["JPEG Quality", ela.get("jpeg_quality", "Unknown")],
                ["Interpretation", ela.get("interpretation", "Not provided")],
            ]
        )

        if ela.get("ela_image"):
            add_image_from_base64(
                ela["ela_image"],
                "ELA Visualization",
            )
    else:
        add_paragraph("ELA results were not included in this report.")

    # Noise
    noise = data.get("noise") or {}

    add_section("6. Noise Residual Analysis")

    if noise:
        add_paragraph(
            noise.get("interpretation", "Interpretation not provided.")
        )

        if noise.get("noise_image"):
            add_image_from_base64(
                noise["noise_image"],
                "Noise Residual Visualization",
            )
    else:
        add_paragraph(
            "Noise residual results were not included in this report."
        )

    # Copy-move
    copy_move = data.get("copy_move") or {}

    add_section("7. Copy-Move Detection")

    if copy_move:
        add_table(
            [
                ["Property", "Value"],
                [
                    "Keypoints Detected",
                    copy_move.get("keypoints_detected", "Unknown"),
                ],
                [
                    "Candidate Matches",
                    copy_move.get("candidate_matches", "Unknown"),
                ],
                [
                    "Potential Indicator",
                    copy_move.get("potential_copy_move", "Unknown"),
                ],
            ]
        )

        add_paragraph(
            copy_move.get("interpretation", "Interpretation not provided.")
        )

        if copy_move.get("visualization"):
            add_image_from_base64(
                copy_move["visualization"],
                "Copy-Move Feature Matching Visualization",
            )
    else:
        add_paragraph(
            "Copy-move detection results were not included in this report."
        )

    # Image comparison
    comparison = data.get("comparison") or {}

    add_section("8. Image Comparison")

    if comparison:
        add_table(
            [
                ["Property", "Value"],
                ["Image A", comparison.get("filename_a", "Unknown")],
                ["Image B", comparison.get("filename_b", "Unknown")],
                ["MAE", comparison.get("mae", "Unknown")],
                ["SSIM", comparison.get("ssim", "Unknown")],
                [
                    "Structural Similarity",
                    f'{comparison.get("similarity_percentage", "Unknown")}%',
                ],
            ]
        )

        if comparison.get("difference_map"):
            add_image_from_base64(
                comparison["difference_map"],
                "Pixel Difference Map",
            )

        add_paragraph(
            comparison.get("interpretation", "Interpretation not provided.")
        )
    else:
        add_paragraph(
            "Image comparison results were not included in this report."
        )

    # Limitations
    add_section("9. Limitations and Disclaimer")

    add_paragraph(
        "This report documents the analysis results supplied to ImageSleuth. "
        "Metadata, SHA-256 hashes, ELA, noise residuals, feature matching, "
        "and image similarity metrics have individual limitations. "
        "These techniques do not independently prove image authenticity "
        "or manipulation. Results should be interpreted with contextual "
        "information and other available evidence."
    )

    document.build(story)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes