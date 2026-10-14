import streamlit as st
from modules.ela_analyzer import perform_ela
from modules.noise_analyzer import analyze_noise
from modules.metadata_analyzer import analyze_metadata
from modules.integrity_checker import calculate_sha256
from modules.report_generator import (
    generate_json_report,
    generate_pdf_report
)


st.set_page_config(
    page_title="ImageSleuth",
    page_icon="🔍",
    layout="wide"
)

st.title("ImageSleuth")
st.subheader("Digital Image Forensics and Tampering Analysis Tool")

st.write(
    "Upload an image to inspect its properties, "
    "extract available metadata, and calculate its SHA-256 hash."
)

uploaded_file = st.file_uploader(
    "Upload an image",
    type=["jpg", "jpeg", "png", "tif", "tiff"]
)

if uploaded_file is not None:

    try:
        metadata = analyze_metadata(uploaded_file)
        sha256_hash = calculate_sha256(uploaded_file)

        st.success("Image loaded successfully.")

        col1, col2 = st.columns(2)

        with col1:
            st.image(
                uploaded_file,
                caption="Uploaded Image",
                use_container_width=True
            )

        with col2:
            st.subheader("Image Information")

            st.write("Filename:", metadata["filename"])
            st.write("Format:", metadata["format"])
            st.write("Width:", metadata["width"])
            st.write("Height:", metadata["height"])
            st.write("Color Mode:", metadata["mode"])

            st.subheader("SHA-256 Hash")

            st.code(sha256_hash)

        st.subheader("EXIF Metadata")

        if metadata["exif"]:
            st.json(metadata["exif"])
        else:
            st.info("No EXIF metadata was found in this image.")

    except Exception as error:
        st.error(f"Unable to analyze the uploaded image: {error}")
        st.divider()

st.header("Forensic Analysis")

col1, col2 = st.columns(2)

with col1:

    st.subheader("Error Level Analysis")

    if metadata["format"] == "JPEG":

        if st.button("Run ELA"):

            try:
                ela_image = perform_ela(uploaded_file)

                st.image(
                    ela_image,
                    caption="ELA Visualization",
                    use_container_width=True
                )

                st.caption(
                    "Interpret differences cautiously. "
                    "ELA does not independently prove manipulation."
                )

            except Exception as error:
                st.error(f"ELA failed: {error}")

    else:
        st.info("ELA is currently supported for JPEG images only.")

with col2:

    st.subheader("Noise Analysis")

    if st.button("Run Noise Analysis"):

        try:
            noise_image = analyze_noise(uploaded_file)

            st.image(
                noise_image,
                caption="Noise-Residual Visualization",
                use_container_width=True
            )

            st.caption(
                "Residual patterns require human interpretation "
                "and are not definitive evidence of tampering."
            )

        except Exception as error:
            st.error(f"Noise analysis failed: {error}")
            st.divider()

st.header("Generate Forensic Report")

report_data = {
    "project": "ImageSleuth",
    "filename": metadata["filename"],
    "format": metadata["format"],
    "width": metadata["width"],
    "height": metadata["height"],
    "sha256": sha256_hash,
    "metadata": metadata["exif"],
    "generated_at_utc": datetime.now(
        timezone.utc
    ).isoformat(),
    "interpretation": (
        "Automated analysis results require "
        "human interpretation."
    )
}