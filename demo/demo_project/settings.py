import os
from pathlib import Path

from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parents[1]
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or get_random_secret_key()
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
ROOT_URLCONF = "demo_project.urls"
WSGI_APPLICATION = "demo_project.wsgi.application"
ASGI_APPLICATION = "demo_project.asgi.application"

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "bd_editor.apps.BDEditorConfig",
    "blog_a.apps.BlogAConfig",
    "blog_b.apps.BlogBConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

LANGUAGE_CODE = "tr"
LANGUAGES = [("en", "English"), ("tr", "Türkçe")]
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

BD_EDITOR = {
    "defaults": {
        "toolbar": {
            "heading": True,
            "bold": True,
            "italic": True,
            "underline": False,
            "image": True,
            "embed": True,
        },
        "uploads": {
            "enabled": True,
            "output_format": "keep",
            "max_file_size": 5 * 1024 * 1024,
            "max_image_pixels": 20_000_000,
            "quality": 85,
        },
        "embeds": {"providers": ["youtube", "vimeo"]},
    },
    "apps": {
        "blog_a": {
            "toolbar": {
                "heading": True,
                "underline": False,
            },
        },
        "blog_b": {
            "toolbar": {
                "heading": False,
                "underline": True,
            },
        },
    },
}
