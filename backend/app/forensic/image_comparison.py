import cv2
import numpy as np

from skimage.metrics import structural_similarity


def compare_images(image_a_path: str, image_b_path: str) -> dict:
    """
    Compare two images using pixel differences, MAE, and SSIM.
    Returns a difference-map visualization and comparison metrics.
    """

    # Load both images
    image_a = cv2.imread(image_a_path)
    image_b = cv2.imread(image_b_path)

    if image_a is None or image_b is None:
        raise ValueError("One or both uploaded images could not be read.")

    # Convert BGR to RGB
    image_a = cv2.cvtColor(image_a, cv2.COLOR_BGR2RGB)
    image_b = cv2.cvtColor(image_b, cv2.COLOR_BGR2RGB)

    # Resize the second image to match the first image's dimensions
    original_dimensions_a = {
        "width": int(image_a.shape[1]),
        "height": int(image_a.shape[0]),
    }

    original_dimensions_b = {
        "width": int(image_b.shape[1]),
        "height": int(image_b.shape[0]),
    }

    image_b = cv2.resize(
        image_b,
        (image_a.shape[1], image_a.shape[0]),
        interpolation=cv2.INTER_AREA,
    )

    # Calculate Mean Absolute Error
    difference = cv2.absdiff(image_a, image_b)
    mae = float(np.mean(difference))

    # Calculate Structural Similarity Index
    _, ssim_map = structural_similarity(
        image_a,
        image_b,
        channel_axis=2,
        data_range=255,
        full=True,
    )

    ssim_score = float(np.mean(ssim_map))

    # Generate a visible difference map
    difference_gray = cv2.cvtColor(
        difference,
        cv2.COLOR_RGB2GRAY,
    )

    difference_map = cv2.normalize(
        difference_gray,
        None,
        0,
        255,
        cv2.NORM_MINMAX,
    )

    difference_map = cv2.applyColorMap(
        difference_map,
        cv2.COLORMAP_JET,
    )

    # Convert BGR visualization to RGB for consistent PNG encoding
    difference_map = cv2.cvtColor(
        difference_map,
        cv2.COLOR_BGR2RGB,
    )

    return {
        "mae": round(mae, 4),
        "ssim": round(ssim_score, 4),
        "similarity_percentage": round(
            max(0.0, min(100.0, ssim_score * 100)),
            2,
        ),
        "dimensions_a": original_dimensions_a,
        "dimensions_b": original_dimensions_b,
        "resized_for_comparison": (
            original_dimensions_a != original_dimensions_b
        ),
        "difference_map": difference_map,
        "interpretation": (
            "MAE measures average pixel-level differences. "
            "SSIM estimates structural similarity. Differences can "
            "result from resizing, compression, lighting, alignment, "
            "or editing; they do not independently establish manipulation."
        ),
    }