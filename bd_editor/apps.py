from django.apps import AppConfig


class BDEditorConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bd_editor"
    verbose_name = "BD-Editor"

    def ready(self):
        from .conf import validate_settings

        validate_settings()
