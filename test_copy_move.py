import cv2
import numpy as np

from backend.app.forensic.copy_move import detect_copy_move

image = np.full((500, 700, 3), 240, dtype=np.uint8)

cv2.rectangle(image, (70, 100), (200, 230), (0, 0, 255), -1)
cv2.circle(image, (135, 165), 35, (255, 255, 255), -1)

cv2.putText(
    image,
    "TEST",
    (90, 180),
    cv2.FONT_HERSHEY_SIMPLEX,
    0.6,
    (0, 0, 0),
    2,
)

# Copy a region to a different location.
image[270:400, 400:530] = image[100:230, 70:200]

cv2.imwrite("copy_move_test.png", image)

result = detect_copy_move("copy_move_test.png")

print("Keypoints detected:", result["keypoints_detected"])
print("Candidate matches:", result["candidate_matches"])
print("Potential copy-move:", result["potential_copy_move"])
print("Message:", result["message"])

cv2.imwrite(
    "copy_move_visualization.png",
    result["visualization"],
)

print("Visualization saved successfully.")
