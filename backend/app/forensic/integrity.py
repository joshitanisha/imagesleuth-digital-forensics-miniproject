import hashlib


def calculate_sha256(image_path: str) -> str:
    sha256 = hashlib.sha256()

    with open(image_path, "rb") as image_file:
        for chunk in iter(lambda: image_file.read(8192), b""):
            sha256.update(chunk)

    return sha256.hexdigest()