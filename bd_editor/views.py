from urllib.parse import urlsplit

from django.apps import apps
from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.utils.translation import gettext as _
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from .conf import get_config
from .uploads import store_uploaded_image


def _is_authorized_editor(request):
    user = request.user
    return bool(user.is_authenticated and user.is_active and user.is_staff)


def _valid_storage_url(value):
    parsed = urlsplit(value)
    if "\\" in value or parsed.username or parsed.password:
        return False
    try:
        port = parsed.port
    except ValueError:
        return False
    if parsed.scheme:
        return (
            parsed.scheme in {"http", "https"}
            and bool(parsed.hostname)
            and (port is None or port > 0)
        )
    return bool(parsed.path) and not parsed.netloc and not parsed.path.startswith("//")


def _max_configured_upload_size():
    global_config = get_config()
    raw_settings = getattr(settings, "BD_EDITOR", {})
    labels = raw_settings.get("apps", {})
    limits = [global_config["uploads"]["max_file_size"]]
    for app_label in labels:
        app_uploads = get_config(app_label)["uploads"]
        if app_uploads["enabled"]:
            limits.append(app_uploads["max_file_size"])
    return max(limits)


@csrf_protect
@require_POST
def upload_image(request):
    """Accept an image only from an authenticated Django staff user."""
    if not _is_authorized_editor(request):
        return JsonResponse(
            {"error": _("You do not have permission to upload images.")},
            status=403,
        )

    content_length = request.META.get("CONTENT_LENGTH")
    if content_length:
        if not content_length.isdecimal():
            return JsonResponse({"error": _("Invalid request content length.")}, status=400)
        if len(content_length) > 20:
            return JsonResponse({"error": _("The upload request is too large.")}, status=413)
        # Reject oversized multipart bodies before accessing POST/FILES, which
        # would make Django parse and spool the uploaded file.
        if int(content_length) > _max_configured_upload_size() + 64 * 1024:
            return JsonResponse({"error": _("The upload request is too large.")}, status=413)

    model_label = request.POST.get("model_label")
    if not model_label:
        return JsonResponse(
            {"error": _("A model label is required for image uploads.")},
            status=400,
        )
    try:
        model = apps.get_model(model_label)
    except (LookupError, ValueError):
        return JsonResponse({"error": _("The requested model is not installed.")}, status=400)

    app_label = model._meta.app_label
    requested_app_label = request.POST.get("app_label")
    if requested_app_label and requested_app_label != app_label:
        return JsonResponse({"error": _("The app label does not match the model.")}, status=400)

    model_name = model._meta.model_name
    permissions = (
        f"{app_label}.add_{model_name}",
        f"{app_label}.change_{model_name}",
    )
    # A staff flag alone is insufficient: tie uploads to the model whose
    # editor submitted the request so unrelated staff cannot upload files.
    if not any(request.user.has_perm(permission) for permission in permissions):
        return JsonResponse(
            {"error": _("You do not have permission to edit this model.")},
            status=403,
        )

    config = get_config(app_label)
    if not config["uploads"]["enabled"]:
        return JsonResponse({"error": _("Image uploads are disabled.")}, status=403)

    uploaded_file = request.FILES.get("image")
    if uploaded_file is None:
        return JsonResponse({"error": _("An image file is required.")}, status=400)

    upload_config = dict(config["uploads"])
    requested_format = request.POST.get("format")
    if upload_config["allow_format_selection"]:
        if requested_format is not None:
            if requested_format not in upload_config["allowed_formats"]:
                return JsonResponse(
                    {"error": _("The selected image format is not allowed.")},
                    status=400,
                )
            upload_config["output_format"] = requested_format
    elif requested_format is not None:
        return JsonResponse(
            {"error": _("The image format is fixed by configuration.")},
            status=400,
        )

    requested_quality = request.POST.get("quality")
    if upload_config["allow_quality_selection"]:
        if requested_quality is not None:
            if not requested_quality.isdecimal() or len(requested_quality) > 3:
                return JsonResponse(
                    {"error": _("The selected image quality is invalid.")},
                    status=400,
                )
            quality = int(requested_quality)
            if not upload_config["min_quality"] <= quality <= upload_config["max_quality"]:
                return JsonResponse(
                    {"error": _("The selected image quality is invalid.")},
                    status=400,
                )
            upload_config["quality"] = quality
    elif requested_quality is not None:
        return JsonResponse(
            {"error": _("Image quality is fixed by configuration.")},
            status=400,
        )

    try:
        result = store_uploaded_image(uploaded_file, upload_config)
    except ValidationError as error:
        return JsonResponse({"error": error.messages[0]}, status=400)

    if not _valid_storage_url(result["url"]):
        return JsonResponse(
            {"error": _("The configured storage returned an unsafe URL.")},
            status=500,
        )

    return JsonResponse(result, status=201)
