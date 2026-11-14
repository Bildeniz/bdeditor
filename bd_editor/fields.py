from django.db import models

from .sanitizer import sanitize_html


class RichTextField(models.TextField):
    """A TextField that sanitizes HTML on Django-managed reads and writes."""

    description = "Sanitized rich-text HTML"

    def _app_label(self):
        return self.model._meta.app_label if self.model is not None else None

    def _model_label(self):
        return self.model._meta.label_lower if self.model is not None else None

    def to_python(self, value):
        converted = super().to_python(value)
        if converted is None:
            return None
        return sanitize_html(converted, app_label=self._app_label())

    def from_db_value(self, value, expression, connection):
        if value is None:
            return None
        return sanitize_html(value, app_label=self._app_label())

    def get_prep_value(self, value):
        # QuerySet.update() and bulk operations use field preparation without
        # consistently passing through model save hooks, so sanitize here too.
        converted = super().get_prep_value(value)
        if converted is None:
            return None
        return sanitize_html(converted, app_label=self._app_label())

    def pre_save(self, model_instance, add):
        value = getattr(model_instance, self.attname)
        if value is not None:
            value = super().get_prep_value(value)
            value = sanitize_html(value, app_label=self._app_label())
            setattr(model_instance, self.attname, value)
        return value

    def formfield(self, **kwargs):
        from .forms import RichTextFormField
        from .widgets import BDRichTextWidget

        kwargs.setdefault("form_class", RichTextFormField)
        kwargs.setdefault("app_label", self._app_label())
        kwargs.setdefault("model_label", self._model_label())
        kwargs["widget"] = BDRichTextWidget(
            app_label=self._app_label(),
            model_label=self._model_label(),
        )
        return super().formfield(**kwargs)
