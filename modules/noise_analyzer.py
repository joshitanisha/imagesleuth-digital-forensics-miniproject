import cv2
import numpy as np
from PIL import Image


def analyze_noise(image_file):
    """
    Generate a grayscale noise-residual visualization.
    """

    image_file.seek(0)

    with Image.open(image_file) as image:
        rgb_image = np.array(image.convert("RGB"))

    gray_image = cv2.cvtColor(
        rgb_image,
        cv2.COLOR_RGB2GRAY
    )

    blurred_image = cv2.GaussianBlur(
        gray_image,
        (5, 5),
        0
    )

    residual = cv2.absdiff(
        gray_image,
        blurred_image
    )

    image_file.seek(0)

    return Image.fromarray(residual)