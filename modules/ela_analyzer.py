from PIL import Image, ImageChops, ImageEnhance
from io import BytesIO


def perform_ela(image_file, quality=90):
    """
    Generate an Error Level Analysis visualization.
    Intended for JPEG images.
    """

    image_file.seek(0)

    with Image.open(image_file) as original:

        if original.format != "JPEG":
            raise ValueError(
                "ELA is implemented for JPEG images only."
            )

        original = original.convert("RGB")

        buffer = BytesIO()

        original.save(
            buffer,
            format="JPEG",
            quality=quality
        )

        buffer.seek(0)

        recompressed = Image.open(buffer).convert("RGB")

        difference = ImageChops.difference(
            original,
            recompressed
        )

        extrema = difference.getextrema()

        max_difference = max(
            channel[1] for channel in extrema
        )

        if max_difference == 0:
            max_difference = 1

        scale = 255.0 / max_difference

        ela_image = ImageEnhance.Brightness(
            difference
        ).enhance(scale)

        image_file.seek(0)

        return ela_image