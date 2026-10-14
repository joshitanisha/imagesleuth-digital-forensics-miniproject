from PIL import Image
from PIL.ExifTags import TAGS


def analyze_metadata(image_file):
    """
    Extract basic image properties and available EXIF metadata.
    """

    image_file.seek(0)

    with Image.open(image_file) as image:

        metadata = {
            "filename": getattr(image_file, "name", "uploaded_image"),
            "format": image.format,
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "exif": {}
        }

        exif_data = image.getexif()

        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, str(tag_id))

            metadata["exif"][tag_name] = str(value)

        image_file.seek(0)

        return metadata