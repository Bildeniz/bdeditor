from django import forms

from .sanitizer import sanitize_html
from .widgets import BDRichTextWidget


class RichTextFormField(forms.CharField):
    """A CharField that sanitizes the submitted rich-text fragment."""

    def __init__(self, *args, app_label=None, model_label=None, **kwargs):
        self.app_label = app_label
        self.model_label = model_label
        kwargs.setdefault(
            "widget",
            BDRichTextWidget(app_label=app_label, model_label=model_label),
        )
        super().__init__(*args, **kwargs)

    def clean(self, value):
        cleaned = super().clean(value)
        if cleaned in self.empty_values:
            return cleaned
        return sanitize_html(cleaned, app_label=self.app_label)
