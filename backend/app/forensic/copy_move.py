import cv2
import numpy as np


def detect_copy_move(image_path: str) -> dict:
    """Identify candidate copy-move regions using SIFT features."""

    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Unable to read the input image.")

    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    sift = cv2.SIFT_create(nfeatures=3000)
    keypoints, descriptors = sift.detectAndCompute(gray, None)

    visualization = image.copy()

    if descriptors is None or len(keypoints) < 4:
        return {
            "keypoints_detected": len(keypoints),
            "candidate_matches": 0,
            "potential_copy_move": False,
            "visualization": visualization,
            "message": "Insufficient distinctive features detected.",
        }

    # Match each descriptor to descriptors from the same image.
    matcher = cv2.BFMatcher(cv2.NORM_L2)
    matches = matcher.knnMatch(descriptors, descriptors, k=5)

    candidates = []
    minimum_distance = max(20, min(width, height) * 0.05)

    for query_index, neighbors in enumerate(matches):
        query_point = np.array(keypoints[query_index].pt)

        # Exclude the query descriptor itself.
        valid_neighbors = [
            match
            for match in neighbors
            if match.trainIdx != query_index
            and np.linalg.norm(
                query_point - np.array(
                    keypoints[match.trainIdx].pt
                )
            ) >= minimum_distance
        ]

        if not valid_neighbors:
            continue

        # Select the best spatially separated descriptor match.
        best_match = valid_neighbors[0]

        # Reject extremely dissimilar descriptors.
        if best_match.distance > 250:
            continue

        candidates.append(
            (
                query_index,
                best_match.trainIdx,
                best_match.distance,
            )
        )

    # Remove duplicate pair representations.
    unique_candidates = {}
    for first, second, distance in candidates:
        pair = tuple(sorted((first, second)))

        if pair[0] != pair[1]:
            if (
                pair not in unique_candidates
                or distance < unique_candidates[pair]
            ):
                unique_candidates[pair] = distance

    candidates = [
        (first, second, distance)
        for (first, second), distance in unique_candidates.items()
    ]

    candidates.sort(key=lambda item: item[2])
    candidates = candidates[:100]

    for first, second, _ in candidates:
        point_a = tuple(
            np.round(keypoints[first].pt).astype(int)
        )
        point_b = tuple(
            np.round(keypoints[second].pt).astype(int)
        )

        cv2.circle(
            visualization, point_a, 5, (0, 255, 0), 2
        )
        cv2.circle(
            visualization, point_b, 5, (0, 165, 255), 2
        )
        cv2.line(
            visualization, point_a, point_b, (255, 0, 0), 1
        )

    potential_copy_move = len(candidates) >= 10

    if potential_copy_move:
        message = (
            "Multiple candidate feature matches were detected. "
            "Further geometric verification is required."
        )
    else:
        message = (
            "Few candidate matches were detected. This does not "
            "rule out copy-move manipulation."
        )

    return {
        "keypoints_detected": len(keypoints),
        "candidate_matches": len(candidates),
        "potential_copy_move": potential_copy_move,
        "visualization": visualization,
        "message": message,
    }