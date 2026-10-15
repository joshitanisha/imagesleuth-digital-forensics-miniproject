from io import BytesIO
from PIL import Image, ImageChops, ImageEnhance


def perform_ela(image_path: str, quality: int = 90) -> Image.Image:
    """
    Generate an Error Level Analysis (ELA) image.

    Args:
        image_path: Path to the original JPEG image.
        quality: JPEG recompression quality, between 1 and 95.

    Returns:
        An RGB image showing amplified recompression differences.
    """

    if not 1 <= quality <= 95:
        raise ValueError("Quality must be between 1 and 95.")

    with Image.open(image_path) as original:
        if original.format != "JPEG":
            raise ValueError("ELA is currently supported only for JPEG images.")

        original_rgb = original.convert("RGB")

        buffer = BytesIO()
        original_rgb.save(buffer, format="JPEG", quality=quality)
        buffer.seek(0)

        with Image.open(buffer) as recompressed:
            recompressed_rgb = recompressed.convert("RGB")

            difference = ImageChops.difference(
                original_rgb,
                recompressed_rgb,
            )

            extrema = difference.getextrema()
            max_difference = max(channel_max for _, channel_max in extrema)

            if max_difference == 0:
                return difference

            scale = 255.0 / max_difference

            ela_image = ImageEnhance.Brightness(
                difference
            ).enhance(scale)

            return ela_image