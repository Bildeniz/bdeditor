from html.parser import HTMLParser

import nh3

from .conf import SAFE_TAGS, get_config
from .embeds import canonicalize_embed_url

_REMOVE_CONTENT_TAGS = {"audio", "embed", "object", "script", "source", "style", "video"}
_IFRAME_FIXED_ATTRIBUTES = {
    "allow": "encrypted-media; fullscreen; picture-in-picture",
    "loading": "lazy",
    "referrerpolicy": "strict-origin-when-cross-origin",
    "sandbox": "allow-scripts allow-same-origin allow-presentation",
}


def _cleaner(config, allow_styles=True):
    options = config["sanitizer"]
    tags = set(options["tags"]) & SAFE_TAGS
    attributes = {
        tag: set(values)
        for tag, values in options["attributes"].items()
        if tag in tags
    }

    if not allow_styles:
        for values in attributes.values():
            values.discard("style")

    css_properties = set(options["css_properties"]) if allow_styles else set()

    def filter_attribute(tag, attribute, value):
        if tag == "iframe" and attribute == "src":
            return canonicalize_embed_url(value, config["embeds"]["providers"])
        if tag == "img" and attribute in {"width", "height"}:
            maximum = config["images"]["max_width" if attribute == "width" else "max_height"]
            if (
                not value.isascii()
                or not value.isdecimal()
                or len(value) > 64
            ):
                return None
            dimension = int(value)
            if dimension < 1:
                return None
            return str(min(dimension, maximum))
        if tag in {"td", "th"} and attribute == "data-colwidth":
            widths = value.split(",")
            if not widths or len(widths) > 32:
                return None
            if any(not width.isdecimal() or not 1 <= int(width) <= 5000 for width in widths):
                return None
            return ",".join(str(int(width)) for width in widths)
        if tag == "iframe" and attribute in {"width", "height"}:
            if value.isdecimal():
                return str(min(int(value), 1920 if attribute == "width" else 1080))
            return None
        return value

    return nh3.Cleaner(
        tags=tags,
        clean_content_tags=_REMOVE_CONTENT_TAGS,
        attributes=attributes,
        attribute_filter=filter_attribute,
        strip_comments=True,
        link_rel="noopener noreferrer nofollow",
        url_schemes=set(options["url_schemes"]),
        filter_style_properties=css_properties,
        url_relative="pass_through" if options["allow_relative_urls"] else "deny",
        # Remote players require scripts, but submitted permission attributes
        # are never trusted; only validated providers receive fixed privileges.
        set_tag_attribute_values={"iframe": _IFRAME_FIXED_ATTRIBUTES},
    )


def _as_html(value):
    if value is None:
        return ""
    if not isinstance(value, str):
        raise TypeError("BD-Editor HTML helpers accept only str or None.")
    return value


def sanitize_html(value, *, app_label=None):
    """Sanitize an HTML fragment with the global or app-specific allowlists."""
    config = get_config(app_label)
    return _cleaner(config).clean(_as_html(value))


def only_html(value, *, app_label=None):
    """Return sanitized HTML while removing all inline style attributes."""
    config = get_config(app_label)
    return _cleaner(config, allow_styles=False).clean(_as_html(value))


class _PlainTextExtractor(HTMLParser):
    _BLOCK_TAGS = {
        "blockquote",
        "br",
        "dd",
        "div",
        "dt",
        "figcaption",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "hr",
        "li",
        "p",
        "pre",
        "tr",
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_starttag(self, tag, _attrs):
        if tag in self._BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self._BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data):
        self.parts.append(data)


def clean_text(value, *, app_label=None):
    """Remove HTML markup and return normalized plain text."""
    parser = _PlainTextExtractor()
    parser.feed(sanitize_html(value, app_label=app_label))
    parser.close()
    lines = []
    for line in "".join(parser.parts).splitlines():
        normalized = " ".join(line.split())
        if normalized:
            lines.append(normalized)
    return "\n".join(lines)
