import json

from django import forms
from django.core.exceptions import ImproperlyConfigured
from django.urls import NoReverseMatch, reverse
from django.utils.translation import get_language

from .conf import get_config


class BDRichTextWidget(forms.Textarea):
    template_name = "bd_editor/widget.html"

    class Media:
        css = {"all": ("bd_editor/editor.css",)}
        js = ("bd_editor/editor.js",)

    def __init__(self, attrs=None, *, app_label=None, model_label=None):
        self.app_label = app_label
        self.model_label = model_label
        super().__init__(attrs)

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        widget = context["widget"]
        config = get_config(self.app_label)
        locale = config["locale"] or (get_language() or "en").split("-", maxsplit=1)[0]
        if locale not in {"en", "tr"}:
            locale = "en"

        widget["attrs"]["class"] = " ".join(
            dict.fromkeys(f'{widget["attrs"].get("class", "")} bd-editor-input'.split())
        )
        widget["attrs"]["data-bd-config"] = json.dumps(config, separators=(",", ":"))
        widget["attrs"]["data-bd-locale"] = locale
        if self.app_label:
            widget["attrs"]["data-bd-app-label"] = self.app_label
        if self.model_label:
            widget["attrs"]["data-bd-model-label"] = self.model_label

        if config["uploads"]["enabled"]:
            if not self.model_label:
                raise ImproperlyConfigured(
                    "BD-Editor image uploads require a model_label so Django model "
                    "permissions can be checked."
                )
            try:
                widget["attrs"]["data-bd-upload-url"] = reverse("bd_editor:upload")
            except NoReverseMatch as error:
                raise ImproperlyConfigured(
                    "BD-Editor image uploads are enabled, but "
                    "path('bd-editor/', include('bd_editor.urls')) is missing."
                ) from error

        return context
