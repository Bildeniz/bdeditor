import io
import warnings
from uuid import uuid4

from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import storages
from django.utils.translation import gettext as _

_FORMAT_EXTENSIONS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


def _load_pillow_image(uploaded_file, config):
    try:
        from PIL import Image, ImageOps, UnidentifiedImageError
    except ModuleNotFoundError as error:
        raise ImproperlyConfigured(
            "Image uploads require Pillow; install the 'bd-editor[images]' extra."
        ) from error

    if uploaded_file.size > config["max_file_size"]:
        raise ValidationError(_("The image exceeds the configured upload size limit."))

    try:
        uploaded_file.seek(0)
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(uploaded_file) as image:
                image_format = image.format
                width, height = image.size
                if width * height > config["max_image_pixels"]:
                    raise ValidationError(_("The image exceeds the configured pixel limit."))
                if image_format not in config["allowed_formats"]:
                    raise ValidationError(_("This image format is not allowed."))
                # verify() checks the container; reopen below because it
                # intentionally invalidates the decoded pixel state.
                image.verify()

            uploaded_file.seek(0)
            with Image.open(uploaded_file) as decoded:
                decoded.load()
                oriented = ImageOps.exif_transpose(decoded).copy()
                return oriented, image_format
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise ValidationError(_("The image is too large to decode safely.")) from error
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as error:
        raise ValidationError(_("The uploaded file is not a valid supported image.")) from error


def _metadata_free_image(image, output_format):
    from PIL import Image

    has_alpha = "A" in image.getbands() or "transparency" in image.info
    # Copy pixels into a new image instead of propagating untrusted EXIF or
    # ancillary chunks from the upload into the stored asset.
    if output_format == "JPEG":
        if has_alpha:
            foreground = image.convert("RGBA")
            clean = Image.new("RGB", foreground.size, "white")
            clean.paste(foreground, mask=foreground.getchannel("A"))
            return clean
        return image.convert("RGB")

    mode = "RGBA" if has_alpha else "RGB"
    clean = Image.new(mode, image.size)
    clean.paste(image.convert(mode))
    return clean


def _encode_image(image, output_format, quality):
    clean_image = _metadata_free_image(image, output_format)
    output = io.BytesIO()
    options = {"format": output_format}
    if output_format == "JPEG":
        options.update(quality=quality, optimize=True, progressive=True)
    elif output_format == "WEBP":
        options.update(quality=quality, method=6)
    else:
        options["optimize"] = True
    clean_image.save(output, **options)
    return output.getvalue(), clean_image.size


def store_uploaded_image(uploaded_file, config):
    """Validate, normalize, re-encode, and store one supported raster image."""
    image, source_format = _load_pillow_image(uploaded_file, config)
    output_format = config["output_format"]
    if output_format == "keep":
        output_format = source_format

    if output_format not in config["allowed_formats"]:
        raise ValidationError(_("The configured output image format is not allowed."))

    try:
        encoded, dimensions = _encode_image(image, output_format, config["quality"])
    except (OSError, ValueError) as error:
        raise ValidationError(_("The image could not be safely re-encoded.")) from error

    try:
        storage = storages[config["storage_alias"]]
    except (KeyError, ImproperlyConfigured) as error:
        raise ImproperlyConfigured(
            f"BD-EDITOR uploads.storage_alias {config['storage_alias']!r} is not configured."
        ) from error

    filename = f"bd_editor/images/{uuid4().hex}.{_FORMAT_EXTENSIONS[output_format]}"
    stored_name = storage.save(filename, ContentFile(encoded))
    url = storage.url(stored_name)
    return {
        "url": url,
        "width": dimensions[0],
        "height": dimensions[1],
        "format": output_format,
    }
