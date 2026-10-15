from PIL import Image, ImageChops, ImageEnhance, ImageFilter


def analyze_noise(image_path: str) -> Image.Image:
    """
    Generate a noise-residual visualization.

    The image is converted to RGB, smoothed with a Gaussian blur,
    and compared with the smoothed version. The difference is
    amplified to make residual details easier to inspect.

    Returns:
        A PIL RGB image containing the amplified residual.
    """

    with Image.open(image_path) as original:
        original_rgb = original.convert("RGB")

        # Estimate the low-frequency image content.
        smoothed = original_rgb.filter(
            ImageFilter.GaussianBlur(radius=2)
        )

        # Extract high-frequency residual differences.
        residual = ImageChops.difference(
            original_rgb,
            smoothed,
        )

        extrema = residual.getextrema()
        max_difference = max(
            channel_max for _, channel_max in extrema
        )

        if max_difference == 0:
            return residual

        # Amplify residual details for visualization.
        scale = 255.0 / max_difference

        amplified = ImageEnhance.Brightness(
            residual
        ).enhance(scale)

        return amplified