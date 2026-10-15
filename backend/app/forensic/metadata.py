from PIL import Image, ExifTags


def analyze_metadata(image_path: str) -> dict:
    with Image.open(image_path) as image:
        metadata = {
            "filename": image.filename.split("/")[-1],
            "format": image.format,
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "exif": {},
        }

        exif_data = image.getexif()

        for tag_id, value in exif_data.items():
            tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
            metadata["exif"][tag_name] = str(value)

        return metadata