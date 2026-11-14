import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parents[1]
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"


def _get_secret_key(debug, base_dir):
    configured_key = os.environ.get("DJANGO_SECRET_KEY")
    if configured_key:
        return configured_key
    if not debug:
        raise ImproperlyConfigured(
            "Set DJANGO_SECRET_KEY when running the demo with DJANGO_DEBUG=0."
        )

    secret_file = base_dir / ".secret_key"
    try:
        # Django signs session cookies with this key. Persist the generated
        # local-only key so autoreloads and later runs keep existing sessions.
        with secret_file.open("x", encoding="utf-8") as key_file:
            configured_key = get_random_secret_key()
            key_file.write(f"{configured_key}\n")
            return configured_key
    except FileExistsError:
        configured_key = secret_file.read_text(encoding="utf-8").strip()
        if configured_key:
            return configured_key
        raise ImproperlyConfigured(
            f"The development secret file {secret_file} is empty; remove it and restart."
        ) from None


SECRET_KEY = _get_secret_key(DEBUG, BASE_DIR)

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
        "DIRS": [BASE_DIR / "templates"],
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

LANGUAGE_CODE = "en"
LANGUAGES = [("en", "English"), ("tr", "Türkçe")]
LOCALE_PATHS = [BASE_DIR / "locale"]
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

BD_EDITOR = {
    "defaults": {
        "toolbar_preset": "full",
        "uploads": {
            "enabled": True,
            "output_format": "keep",
            "max_file_size": 5 * 1024 * 1024,
            "max_image_pixels": 20_000_000,
            "quality": 85,
        },
        "embeds": {"providers": ["youtube", "vimeo"]},
        "locale": None,
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
