# Quick start

## Requirements and installation

BD-Editor supports Python 3.10+ and Django 5.2 LTS and compatible Django 6.x
releases below 6.2. Install the package:

```shell
pip install bd-editor
```

Image upload is optional and requires Pillow:

```shell
pip install "bd-editor[images]"
```

## Add BD-Editor to a project

```python
# settings.py
INSTALLED_APPS = [
    # ...
    "bd_editor",
]
```

The upload URL must be included even when uploads are initially disabled. It is
used by the widget when image upload is enabled:

```python
# urls.py
from django.urls import include, path

urlpatterns = [
    # ...
    path("bd-editor/", include("bd_editor.urls")),
]
```

Create a model with the provided field:

```python
# blog/models.py
from django.db import models
from bd_editor.fields import RichTextField


class Article(models.Model):
    title = models.CharField(max_length=200)
    body = RichTextField()
```

The normal Django admin and `ModelForm` use the bundled editor widget for
`RichTextField`. Run migrations as usual:

```shell
python manage.py makemigrations
python manage.py migrate
```

## Render saved content safely

Use the provided template filters instead of `safe`:

```django
{% load bd_editor_tags %}

{{ article.body|bd_richtext }}
{{ article.body|bd_only_html }}
{{ article.body|bd_clean_text }}
```

`bd_richtext` sanitizes and renders allowlisted HTML. `bd_only_html` also
removes inline style attributes. `bd_clean_text` returns plain text and remains
subject to Django's normal template escaping. The Python helpers are available
from `bd_editor.sanitizer`.

## Configure the toolbar

Toolbar settings are partial, nested overrides. The built-in defaults are
merged with `BD_EDITOR["defaults"]`, followed by the override for the model's
Django app label:

```python
# settings.py
BD_EDITOR = {
    "defaults": {
        "toolbar": {
            "heading": True,
            "bold": True,
            "italic": True,
            "underline": False,
            "image": False,
        },
    },
    "apps": {
        "blog": {
            "toolbar": {
                "heading": True,
                "underline": False,
            },
        },
        "pages": {
            "toolbar": {
                "heading": False,
                "underline": True,
            },
        },
    },
}
```

Keys in `apps` are Django app labels, not Python module paths. Invalid or
unknown security-sensitive options raise `ImproperlyConfigured` during app
startup.

## Enable image uploads and video embeds

```python
BD_EDITOR = {
    "defaults": {
        "toolbar": {"image": True, "embed": True},
        "uploads": {
            "enabled": True,
            "max_file_size": 5 * 1024 * 1024,
            "max_image_pixels": 20_000_000,
            "output_format": "WEBP",
            "allowed_formats": ["JPEG", "PNG", "WEBP"],
            "quality": 85,
            "storage_alias": "default",
        },
        "embeds": {"providers": ["youtube", "vimeo"]},
    },
}
```

The upload endpoint is CSRF-protected and requires an active staff user with
add or change permission for the associated model. Files are decoded as
images, checked against byte and pixel limits, re-encoded, and stored using the
selected Django storage alias. The `output_format` can be `keep`, `JPEG`,
`PNG`, or `WEBP`; Pillow is required when uploads are enabled. Video files are
never accepted. The editor's embed button accepts only URLs for enabled
providers.

## Demo

The repository includes a two-app demo illustrating different app-level
toolbar settings. From the repository root:

```shell
pip install -e ".[images]"
cd demo
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open `/admin/` and create an article in either demo app. See
[configuration](configuration.md), [API reference](api.md), and
[security](security.md) for all settings and boundaries.
