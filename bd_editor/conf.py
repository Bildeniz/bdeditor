from collections.abc import Mapping
from copy import deepcopy
from importlib.util import find_spec

from django.apps import apps
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

SAFE_TAGS = {
    "a",
    "b",
    "blockquote",
    "br",
    "caption",
    "code",
    "col",
    "colgroup",
    "dd",
    "del",
    "div",
    "dl",
    "dt",
    "em",
    "figcaption",
    "figure",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "iframe",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
}

SAFE_ATTRIBUTES = {
    "a": {"href", "title"},
    "blockquote": {"style"},
    "div": {"style"},
    "h1": {"style"},
    "h2": {"style"},
    "h3": {"style"},
    "h4": {"style"},
    "h5": {"style"},
    "h6": {"style"},
    "iframe": {"src", "title", "width", "height"},
    "img": {"src", "alt", "title", "width", "height", "style"},
    "li": {"style"},
    "p": {"style"},
    "pre": {"style"},
    "span": {"style"},
    "td": {"colspan", "rowspan", "data-colwidth", "style"},
    "th": {"colspan", "rowspan", "data-colwidth", "style"},
}

SAFE_URL_SCHEMES = {"http", "https", "mailto", "tel"}
SAFE_EMBED_PROVIDERS = {"youtube", "vimeo"}
SAFE_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
SAFE_CSS_PROPERTIES = {
    "background-color",
    "border",
    "border-bottom-color",
    "border-bottom-style",
    "border-bottom-width",
    "border-color",
    "border-left-color",
    "border-left-style",
    "border-left-width",
    "border-right-color",
    "border-right-style",
    "border-right-width",
    "border-style",
    "border-top-color",
    "border-top-style",
    "border-top-width",
    "border-width",
    "color",
    "clear",
    "display",
    "float",
    "height",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "line-height",
    "margin",
    "margin-bottom",
    "margin-left",
    "margin-right",
    "margin-top",
    "max-width",
    "max-height",
    "padding",
    "padding-bottom",
    "padding-left",
    "padding-right",
    "padding-top",
    "text-align",
    "text-decoration",
    "text-indent",
    "text-transform",
    "vertical-align",
    "white-space",
}

_SMALL_TOOLBAR = {
    "heading": True,
    "bold": True,
    "italic": True,
    "text_color": False,
    "background_color": False,
    "underline": False,
    "strike": False,
    "bullet_list": True,
    "ordered_list": True,
    "blockquote": False,
    "code_block": False,
    "link": True,
    "image": False,
    "image_editing": False,
    "embed": False,
    "table": False,
    "text_align": False,
    "source": False,
    "undo": True,
    "redo": True,
}

_STANDARD_TOOLBAR = {
    **_SMALL_TOOLBAR,
    "text_color": True,
    "background_color": True,
    "strike": True,
    "blockquote": True,
    "code_block": True,
    "embed": True,
    "table": True,
    "text_align": True,
    "image_editing": True,
    "source": True,
}

_FULL_TOOLBAR = {
    **_STANDARD_TOOLBAR,
    "underline": True,
    "image": True,
}

_TOOLBAR_PRESETS = {
    "small": _SMALL_TOOLBAR,
    "standard": _STANDARD_TOOLBAR,
    "full": _FULL_TOOLBAR,
}

_DEFAULTS = {
    "toolbar_preset": "standard",
    "toolbar": deepcopy(_STANDARD_TOOLBAR),
    "sanitizer": {
        "tags": sorted(SAFE_TAGS),
        "attributes": {tag: sorted(attributes) for tag, attributes in SAFE_ATTRIBUTES.items()},
        "css_properties": sorted(SAFE_CSS_PROPERTIES),
        "url_schemes": ["http", "https", "mailto", "tel"],
        "allow_relative_urls": True,
    },
    "uploads": {
        "enabled": False,
        "max_file_size": 5 * 1024 * 1024,
        "max_image_pixels": 20_000_000,
        "output_format": "keep",
        "allowed_formats": ["JPEG", "PNG", "WEBP"],
        "allow_format_selection": True,
        "allow_quality_selection": True,
        "quality": 85,
        "min_quality": 1,
        "max_quality": 100,
        "show_size_estimates": True,
        "warn_missing_alt": False,
        "storage_alias": "default",
    },
    "images": {
        "allow_resize": True,
        "max_width": 2048,
        "max_height": 2048,
        "float_max_width_percent": 50,
        "preserve_aspect_ratio": True,
        "allowed_layouts": [
            "block-left",
            "block-center",
            "block-right",
            "inline",
            "float-left",
            "float-right",
        ],
        "default_layout": "block-left",
        "inline_vertical_alignments": ["top", "middle", "bottom"],
        "default_inline_vertical_alignment": "top",
    },
    "drafts": {"enabled": False, "ttl_days": 7},
    "embeds": {"providers": ["youtube"]},
    "locale": None,
}

_CONFIG_KEYS = set(_DEFAULTS)
_TOOLBAR_KEYS = set(_DEFAULTS["toolbar"])
_SANITIZER_KEYS = set(_DEFAULTS["sanitizer"])
_UPLOAD_KEYS = set(_DEFAULTS["uploads"])
_IMAGE_KEYS = set(_DEFAULTS["images"])
_DRAFT_KEYS = set(_DEFAULTS["drafts"])
_FORBIDDEN_TAGS = {"audio", "embed", "object", "script", "source", "style", "video"}
_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
_MAX_UPLOAD_BYTES = 100 * 1024 * 1024
_MAX_IMAGE_PIXELS = 50_000_000
_MAX_IMAGE_DIMENSION = 10_000
_IMAGE_LAYOUTS = {
    "block-left",
    "block-center",
    "block-right",
    "inline",
    "float-left",
    "float-right",
}
_INLINE_VERTICAL_ALIGNMENTS = {"top", "middle", "bottom", "baseline"}
_TEXT_ALIGNABLE_TAGS = {"p", "h1", "h2", "h3", "h4", "h5", "h6"}
_IMAGE_LAYOUT_CSS_PROPERTIES = {
    "block-left": {
        "clear",
        "display",
        "float",
        "max-height",
        "max-width",
        "margin-bottom",
        "margin-left",
        "margin-right",
    },
    "block-center": {
        "clear",
        "display",
        "float",
        "max-height",
        "max-width",
        "margin-bottom",
        "margin-left",
        "margin-right",
    },
    "block-right": {
        "clear",
        "display",
        "float",
        "max-height",
        "max-width",
        "margin-bottom",
        "margin-left",
        "margin-right",
    },
    "inline": {
        "clear",
        "display",
        "float",
        "margin-left",
        "margin-right",
        "max-height",
        "max-width",
        "vertical-align",
    },
    "float-left": {
        "clear",
        "display",
        "float",
        "margin-bottom",
        "margin-right",
        "max-height",
        "max-width",
    },
    "float-right": {
        "clear",
        "display",
        "float",
        "margin-bottom",
        "margin-left",
        "max-height",
        "max-width",
    },
}


def _fail(path, message):
    raise ImproperlyConfigured(f"BD_EDITOR {path}: {message}")


def _merge(target, overrides, path):
    if not isinstance(overrides, Mapping):
        _fail(path, "must be a mapping.")

    for key, value in overrides.items():
        if key not in target:
            _fail(path, f"unknown option {key!r}.")
        current = target[key]
        child_path = f"{path}.{key}"
        if isinstance(current, dict):
            if not isinstance(value, Mapping):
                _fail(child_path, "must be a mapping.")
            _merge(current, value, child_path)
        else:
            target[key] = deepcopy(value)


def _merge_config_layer(config, overrides, path):
    if not isinstance(overrides, Mapping):
        _fail(path, "must be a mapping.")

    if "toolbar_preset" in overrides:
        preset = overrides["toolbar_preset"]
        if not isinstance(preset, str) or preset not in _TOOLBAR_PRESETS:
            _fail(
                f"{path}.toolbar_preset",
                "must be one of 'small', 'standard', or 'full'.",
            )
        config["toolbar_preset"] = preset
        config["toolbar"] = deepcopy(_TOOLBAR_PRESETS[preset])

    # A preset establishes the base toolbar for this configuration layer.
    # Explicit toolbar options in the same layer remain the final override.
    remaining = {key: value for key, value in overrides.items() if key != "toolbar_preset"}
    _merge(config, remaining, path)


def _require_list(value, path):
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        _fail(path, "must be a list of strings.")


def _validate_config(config, path):
    if (
        not isinstance(config["toolbar_preset"], str)
        or config["toolbar_preset"] not in _TOOLBAR_PRESETS
    ):
        _fail(
            f"{path}.toolbar_preset",
            "must be one of 'small', 'standard', or 'full'.",
        )

    toolbar = config["toolbar"]
    if not isinstance(toolbar, Mapping):
        _fail(f"{path}.toolbar", "must be a mapping of toolbar names to booleans.")
    if any(not isinstance(key, str) for key in toolbar):
        _fail(f"{path}.toolbar", "option names must be strings.")
    if set(toolbar) != _TOOLBAR_KEYS:
        missing = sorted(_TOOLBAR_KEYS - set(toolbar))
        unknown = sorted(set(toolbar) - _TOOLBAR_KEYS)
        if missing:
            _fail(f"{path}.toolbar", f"missing options: {', '.join(missing)}.")
        _fail(f"{path}.toolbar", f"unknown options: {', '.join(unknown)}.")
    if any(type(value) is not bool for value in toolbar.values()):
        _fail(f"{path}.toolbar", "every toolbar option must be a boolean.")

    sanitizer = config["sanitizer"]
    if not isinstance(sanitizer, Mapping) or set(sanitizer) != _SANITIZER_KEYS:
        _fail(f"{path}.sanitizer", "must contain the supported sanitizer options.")

    _require_list(sanitizer["tags"], f"{path}.sanitizer.tags")
    tags = set(sanitizer["tags"])
    if len(tags) != len(sanitizer["tags"]):
        _fail(f"{path}.sanitizer.tags", "must not contain duplicates.")
    unsafe_tags = tags - SAFE_TAGS
    forbidden_tags = tags & _FORBIDDEN_TAGS
    if unsafe_tags or forbidden_tags:
        invalid = sorted(unsafe_tags | forbidden_tags)
        _fail(f"{path}.sanitizer.tags", f"unsupported or unsafe tags: {', '.join(invalid)}.")

    attributes = sanitizer["attributes"]
    if not isinstance(attributes, Mapping):
        _fail(f"{path}.sanitizer.attributes", "must be a mapping of tags to attribute lists.")
    for tag, values in attributes.items():
        if tag not in SAFE_ATTRIBUTES:
            _fail(f"{path}.sanitizer.attributes", f"unsupported tag {tag!r}.")
        _require_list(values, f"{path}.sanitizer.attributes.{tag}")
        if not set(values).issubset(SAFE_ATTRIBUTES[tag]):
            invalid = sorted(set(values) - SAFE_ATTRIBUTES[tag])
            _fail(
                f"{path}.sanitizer.attributes.{tag}",
                f"unsupported or unsafe attributes: {', '.join(invalid)}.",
            )

    _require_list(sanitizer["css_properties"], f"{path}.sanitizer.css_properties")
    if not set(sanitizer["css_properties"]).issubset(SAFE_CSS_PROPERTIES):
        invalid = sorted(set(sanitizer["css_properties"]) - SAFE_CSS_PROPERTIES)
        _fail(
            f"{path}.sanitizer.css_properties",
            f"unsupported or unsafe CSS properties: {', '.join(invalid)}.",
        )
    allowed_css = set(sanitizer["css_properties"])
    span_attributes = set(attributes.get("span", []))
    for toolbar_option, css_property in (
        ("text_color", "color"),
        ("background_color", "background-color"),
    ):
        if toolbar[toolbar_option] and (
            css_property not in allowed_css
            or "span" not in tags
            or "style" not in span_attributes
        ):
            _fail(
                f"{path}.toolbar.{toolbar_option}",
                f"requires the span style attribute and sanitizer.css_properties "
                f"to allow {css_property!r}.",
            )
    if toolbar["text_align"]:
        text_align_tags = tags & _TEXT_ALIGNABLE_TAGS
        if (
            "text-align" not in allowed_css
            or not text_align_tags
            or any("style" not in attributes.get(tag, []) for tag in text_align_tags)
        ):
            _fail(
                f"{path}.toolbar.text_align",
                "requires style on an allowed paragraph/heading tag and "
                "sanitizer.css_properties to allow 'text-align'.",
            )

    _require_list(sanitizer["url_schemes"], f"{path}.sanitizer.url_schemes")
    if not set(sanitizer["url_schemes"]).issubset(SAFE_URL_SCHEMES):
        invalid = sorted(set(sanitizer["url_schemes"]) - SAFE_URL_SCHEMES)
        _fail(
            f"{path}.sanitizer.url_schemes",
            f"unsupported or unsafe URL schemes: {', '.join(invalid)}.",
        )
    if type(sanitizer["allow_relative_urls"]) is not bool:
        _fail(f"{path}.sanitizer.allow_relative_urls", "must be a boolean.")

    uploads = config["uploads"]
    if not isinstance(uploads, Mapping) or set(uploads) != _UPLOAD_KEYS:
        _fail(f"{path}.uploads", "must contain the supported upload options.")
    if type(uploads["enabled"]) is not bool:
        _fail(f"{path}.uploads.enabled", "must be a boolean.")
    for key in ("max_file_size", "max_image_pixels"):
        if type(uploads[key]) is not int or uploads[key] <= 0:
            _fail(f"{path}.uploads.{key}", "must be a positive integer.")
    if uploads["max_file_size"] > _MAX_UPLOAD_BYTES:
        _fail(
            f"{path}.uploads.max_file_size",
            f"must not exceed {_MAX_UPLOAD_BYTES} bytes.",
        )
    if uploads["max_image_pixels"] > _MAX_IMAGE_PIXELS:
        _fail(
            f"{path}.uploads.max_image_pixels",
            f"must not exceed {_MAX_IMAGE_PIXELS} pixels.",
        )
    if not isinstance(uploads["output_format"], str) or uploads["output_format"] not in {
        "keep",
        *_IMAGE_FORMATS,
    }:
        _fail(
            f"{path}.uploads.output_format",
            "must be one of 'keep', 'JPEG', 'PNG', or 'WEBP'.",
        )
    if type(uploads["quality"]) is not int or not 1 <= uploads["quality"] <= 100:
        _fail(f"{path}.uploads.quality", "must be an integer from 1 to 100.")
    _require_list(uploads["allowed_formats"], f"{path}.uploads.allowed_formats")
    allowed_formats = set(uploads["allowed_formats"])
    if (
        not allowed_formats
        or len(allowed_formats) != len(uploads["allowed_formats"])
        or not allowed_formats.issubset(_IMAGE_FORMATS)
    ):
        _fail(
            f"{path}.uploads.allowed_formats",
            "must contain unique values from JPEG, PNG, and WEBP.",
        )
    if uploads["output_format"] != "keep" and uploads["output_format"] not in allowed_formats:
        _fail(
            f"{path}.uploads.output_format",
            "must also appear in uploads.allowed_formats.",
        )
    if not isinstance(uploads["storage_alias"], str) or not uploads["storage_alias"].strip():
        _fail(f"{path}.uploads.storage_alias", "must be a non-empty storage alias.")
    if toolbar["image"] and not uploads["enabled"]:
        _fail(f"{path}.toolbar.image", "requires uploads.enabled = True.")
    if uploads["enabled"] and find_spec("PIL") is None:
        _fail(
            f"{path}.uploads.enabled",
            "requires Pillow; install the 'bd-editor[images]' extra.",
        )
    for key in (
        "allow_format_selection",
        "allow_quality_selection",
        "show_size_estimates",
        "warn_missing_alt",
    ):
        if type(uploads[key]) is not bool:
            _fail(f"{path}.uploads.{key}", "must be a boolean.")
    for key in ("min_quality", "max_quality"):
        if type(uploads[key]) is not int or not 1 <= uploads[key] <= 100:
            _fail(f"{path}.uploads.{key}", "must be an integer from 1 to 100.")
    if uploads["min_quality"] > uploads["max_quality"]:
        _fail(f"{path}.uploads.min_quality", "must not exceed uploads.max_quality.")
    if not uploads["min_quality"] <= uploads["quality"] <= uploads["max_quality"]:
        _fail(
            f"{path}.uploads.quality",
            "must be within the configured min_quality and max_quality.",
        )

    images = config["images"]
    if not isinstance(images, Mapping) or set(images) != _IMAGE_KEYS:
        _fail(f"{path}.images", "must contain the supported image options.")
    if type(images["allow_resize"]) is not bool:
        _fail(f"{path}.images.allow_resize", "must be a boolean.")
    if type(images["preserve_aspect_ratio"]) is not bool:
        _fail(f"{path}.images.preserve_aspect_ratio", "must be a boolean.")
    for key in ("max_width", "max_height"):
        if type(images[key]) is not int or not 1 <= images[key] <= _MAX_IMAGE_DIMENSION:
            _fail(
                f"{path}.images.{key}",
                f"must be an integer from 1 to {_MAX_IMAGE_DIMENSION}.",
            )
    if type(images["float_max_width_percent"]) is not int or not (
        25 <= images["float_max_width_percent"] <= 75
    ):
        _fail(
            f"{path}.images.float_max_width_percent",
            "must be an integer from 25 to 75.",
        )
    _require_list(images["allowed_layouts"], f"{path}.images.allowed_layouts")
    image_layouts = set(images["allowed_layouts"])
    if (
        not image_layouts
        or len(image_layouts) != len(images["allowed_layouts"])
        or not image_layouts.issubset(_IMAGE_LAYOUTS)
    ):
        invalid = sorted(image_layouts - _IMAGE_LAYOUTS)
        message = (
            f"unsupported layouts: {', '.join(invalid)}."
            if invalid
            else "must contain unique supported layouts."
        )
        _fail(f"{path}.images.allowed_layouts", message)
    if not isinstance(images["default_layout"], str) or (
        images["default_layout"] not in image_layouts
    ):
        _fail(
            f"{path}.images.default_layout",
            "must be one of images.allowed_layouts.",
        )
    _require_list(
        images["inline_vertical_alignments"],
        f"{path}.images.inline_vertical_alignments",
    )
    inline_vertical_alignments = set(images["inline_vertical_alignments"])
    if (
        not inline_vertical_alignments
        or len(inline_vertical_alignments) != len(images["inline_vertical_alignments"])
        or not inline_vertical_alignments.issubset(_INLINE_VERTICAL_ALIGNMENTS)
    ):
        invalid = sorted(inline_vertical_alignments - _INLINE_VERTICAL_ALIGNMENTS)
        message = (
            f"unsupported values: {', '.join(invalid)}."
            if invalid
            else "must contain unique supported values."
        )
        _fail(f"{path}.images.inline_vertical_alignments", message)
    if not isinstance(images["default_inline_vertical_alignment"], str) or (
        images["default_inline_vertical_alignment"] not in inline_vertical_alignments
    ):
        _fail(
            f"{path}.images.default_inline_vertical_alignment",
            "must be one of images.inline_vertical_alignments.",
        )
    _require_list(
        images["inline_vertical_alignments"],
        f"{path}.images.inline_vertical_alignments",
    )
    inline_vertical_alignments = set(images["inline_vertical_alignments"])
    if (
        not inline_vertical_alignments
        or len(inline_vertical_alignments) != len(images["inline_vertical_alignments"])
        or not inline_vertical_alignments.issubset(_INLINE_VERTICAL_ALIGNMENTS)
    ):
        invalid = sorted(inline_vertical_alignments - _INLINE_VERTICAL_ALIGNMENTS)
        message = (
            f"unsupported values: {', '.join(invalid)}."
            if invalid
            else "must contain unique supported values."
        )
        _fail(
            f"{path}.images.inline_vertical_alignments",
            message,
        )
    if not isinstance(images["default_inline_vertical_alignment"], str) or (
        images["default_inline_vertical_alignment"] not in inline_vertical_alignments
    ):
        _fail(
            f"{path}.images.default_inline_vertical_alignment",
            "must be one of images.inline_vertical_alignments.",
        )
    if toolbar["image_editing"]:
        image_attributes = set(attributes.get("img", []))
        required_image_attributes = {"src", "alt", "title", "style"}
        if images["allow_resize"]:
            required_image_attributes.update({"width", "height"})
        required_image_css = set().union(
            *(_IMAGE_LAYOUT_CSS_PROPERTIES[layout] for layout in image_layouts)
        )
        if images["preserve_aspect_ratio"]:
            required_image_css.add("height")
        if (
            "img" not in tags
            or not required_image_attributes.issubset(image_attributes)
            or not required_image_css.issubset(allowed_css)
        ):
            _fail(
                f"{path}.toolbar.image_editing",
                "requires src/alt/title/style on img, safe layout CSS properties, "
                "and width/height when resizing is enabled.",
            )

    drafts = config["drafts"]
    if not isinstance(drafts, Mapping) or set(drafts) != _DRAFT_KEYS:
        _fail(f"{path}.drafts", "must contain the supported draft options.")
    if type(drafts["enabled"]) is not bool:
        _fail(f"{path}.drafts.enabled", "must be a boolean.")
    if type(drafts["ttl_days"]) is not int or not 1 <= drafts["ttl_days"] <= 90:
        _fail(f"{path}.drafts.ttl_days", "must be an integer from 1 to 90.")

    embeds = config["embeds"]
    if not isinstance(embeds, Mapping) or set(embeds) != {"providers"}:
        _fail(f"{path}.embeds", "must contain only the providers option.")
    _require_list(embeds["providers"], f"{path}.embeds.providers")
    providers = set(embeds["providers"])
    if (
        len(providers) != len(embeds["providers"])
        or not providers.issubset(SAFE_EMBED_PROVIDERS)
    ):
        invalid = sorted(providers - SAFE_EMBED_PROVIDERS)
        message = (
            f"unsupported providers: {', '.join(invalid)}."
            if invalid
            else "must not contain duplicates."
        )
        _fail(f"{path}.embeds.providers", message)
    if toolbar["embed"] and not providers:
        _fail(f"{path}.toolbar.embed", "requires at least one configured embed provider.")

    if config["locale"] is not None and (
        not isinstance(config["locale"], str) or config["locale"] not in {"en", "tr"}
    ):
        _fail(f"{path}.locale", "must be None, 'en', or 'tr'.")


def get_config(app_label=None):
    """Return a validated, isolated settings snapshot for one Django app."""
    raw_settings = getattr(settings, "BD_EDITOR", {})
    if not isinstance(raw_settings, Mapping):
        _fail("settings", "must be a mapping.")
    if any(not isinstance(key, str) for key in raw_settings):
        _fail("settings", "top-level option names must be strings.")
    unknown_root_options = set(raw_settings) - {"defaults", "apps"}
    if unknown_root_options:
        _fail("settings", f"unknown top-level options: {', '.join(sorted(unknown_root_options))}.")

    config = deepcopy(_DEFAULTS)
    _merge_config_layer(config, raw_settings.get("defaults", {}), "defaults")

    app_configs = raw_settings.get("apps", {})
    if not isinstance(app_configs, Mapping):
        _fail("apps", "must be a mapping of Django app labels to option mappings.")
    if app_label is not None:
        if not isinstance(app_label, str):
            _fail("app_label", "must be a string or None.")
        app_overrides = app_configs.get(app_label, {})
        _merge_config_layer(config, app_overrides, f"apps.{app_label}")

    scope = f"apps.{app_label}" if app_label in app_configs else "defaults"
    _validate_config(config, scope)
    return config


def validate_settings():
    """Validate global options and every app-specific configuration at startup."""
    raw_settings = getattr(settings, "BD_EDITOR", {})
    get_config()
    app_configs = raw_settings.get("apps", {})
    for app_label in app_configs:
        if not isinstance(app_label, str):
            _fail("apps", "every key must be a Django app label string.")
        try:
            apps.get_app_config(app_label)
        except LookupError as error:
            raise ImproperlyConfigured(
                f"BD_EDITOR apps.{app_label}: no installed Django app has this label."
            ) from error
        get_config(app_label)
