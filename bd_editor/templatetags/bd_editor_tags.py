from django import template
from django.utils.safestring import mark_safe

from bd_editor.sanitizer import clean_text, only_html, sanitize_html

register = template.Library()


@register.filter
def bd_richtext(value, app_label=None):
    """Render only server-sanitized rich text as HTML."""
    return mark_safe(sanitize_html(value, app_label=app_label))  # noqa: S308 - sanitized first.


@register.filter
def bd_only_html(value, app_label=None):
    """Render sanitized rich text without inline styles."""
    return mark_safe(only_html(value, app_label=app_label))  # noqa: S308 - sanitized first.


@register.filter
def bd_clean_text(value, app_label=None):
    """Return plain text with Django's normal template escaping enabled."""
    return clean_text(value, app_label=app_label)
