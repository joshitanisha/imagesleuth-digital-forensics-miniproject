import cv2
import numpy as np

from backend.app.forensic.copy_move import detect_copy_move


# Create a synthetic test image.
image = np.full((500, 700, 3), 240, dtype=np.uint8)

# Draw a distinctive region.
cv2.rectangle(
    image, (70, 100), (200, 230), (0, 0, 255), -1
)

cv2.circle(
    image, (135, 165), 35, (255, 255, 255), -1
)

cv2.putText(
    image,
    "TEST",
    (90, 180),
    cv2.FONT_HERSHEY_SIMPLEX,
    0.6,
    (0, 0, 0),
    2,
)

# Copy the region to another location.
image[270:400, 400:530] = image[100:230, 70:200]

# Save the test image.
test_path = "copy_move_test.png"
cv2.imwrite(test_path, image)

# Run copy-move detection.
result = detect_copy_move(test_path)

print("Keypoints detected:", result["keypoints_detected"])
print("Candidate matches:", result["candidate_matches"])
print("Potential copy-move:", result["potential_copy_move"])
print("Message:", result["message"])

# Save the visualization.
cv2.imwrite(
    "copy_move_visualization.png",
    result["visualization"],
)

print("Visualization saved as copy_move_visualization.png")