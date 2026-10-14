import hashlib


def calculate_sha256(image_file):
    """
    Calculate the SHA-256 hash of the original file.
    """

    image_file.seek(0)

    sha256 = hashlib.sha256()

    for chunk in iter(lambda: image_file.read(4096), b""):
        sha256.update(chunk)

    image_file.seek(0)

    return sha256.hexdigest()


def compare_hashes(hash1, hash2):
    """
    Compare two SHA-256 hash values.
    """

    return hash1 == hash2