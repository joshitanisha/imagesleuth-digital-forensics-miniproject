import json
from datetime import datetime, timezone
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def generate_json_report(report_data):
    """
    Convert report data into downloadable JSON bytes.
    """

    return json.dumps(
        report_data,
        indent=4,
        ensure_ascii=False
    ).encode("utf-8")


def generate_pdf_report(report_data):
    """
    Generate a basic PDF forensic report.
    """

    buffer = BytesIO()

    pdf = canvas.Canvas(
        buffer,
        pagesize=A4
    )

    width, height = A4
    y = height - 50

    pdf.setTitle("ImageSleuth Forensic Report")

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(
        50,
        y,
        "ImageSleuth Forensic Report"
    )

    y -= 35

    pdf.setFont("Helvetica", 10)

    pdf.drawString(
        50,
        y,
        "Generated: " + datetime.now(
            timezone.utc
        ).strftime("%Y-%m-%d %H:%M:%S UTC")
    )

    y -= 30

    for key, value in report_data.items():

        text = f"{key}: {str(value)}"

        while text:

            if y < 50:
                pdf.showPage()
                pdf.setFont("Helvetica", 10)
                y = height - 50

            pdf.drawString(
                50,
                y,
                text[:100]
            )

            text = text[100:]
            y -= 15

    pdf.save()

    buffer.seek(0)

    return buffer.getvalue()