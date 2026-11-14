import importlib.util
from pathlib import Path

import pytest
from django.core.exceptions import ImproperlyConfigured

_DEMO_SETTINGS = (
    Path(__file__).resolve().parents[1]
    / "demo"
    / "demo_project"
    / "settings.py"
)


def _load_demo_settings():
    spec = importlib.util.spec_from_file_location("bd_editor_test_demo_settings", _DEMO_SETTINGS)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_debug_demo_secret_key_is_stable_across_settings_reloads(monkeypatch, tmp_path):
    monkeypatch.setenv("DJANGO_SECRET_KEY", "temporary-test-key")
    monkeypatch.setenv("DJANGO_DEBUG", "1")
    module = _load_demo_settings()
    monkeypatch.delenv("DJANGO_SECRET_KEY")

    first_key = module._get_secret_key(True, tmp_path)
    second_key = module._get_secret_key(True, tmp_path)

    assert first_key == second_key
    assert first_key == (tmp_path / ".secret_key").read_text(encoding="utf-8").strip()


def test_demo_production_mode_requires_an_explicit_secret_key(monkeypatch):
    monkeypatch.delenv("DJANGO_SECRET_KEY", raising=False)
    monkeypatch.setenv("DJANGO_DEBUG", "0")

    with pytest.raises(ImproperlyConfigured, match="Set DJANGO_SECRET_KEY"):
        _load_demo_settings()


def test_demo_rejects_an_empty_persisted_development_secret(monkeypatch, tmp_path):
    monkeypatch.setenv("DJANGO_SECRET_KEY", "temporary-test-key")
    monkeypatch.setenv("DJANGO_DEBUG", "1")
    module = _load_demo_settings()
    monkeypatch.delenv("DJANGO_SECRET_KEY")
    (tmp_path / ".secret_key").write_text("", encoding="utf-8")

    with pytest.raises(ImproperlyConfigured, match="development secret file"):
        module._get_secret_key(True, tmp_path)


def test_demo_uses_an_explicit_secret_key_in_production_mode(monkeypatch):
    monkeypatch.setenv("DJANGO_SECRET_KEY", "configured-production-secret")
    monkeypatch.setenv("DJANGO_DEBUG", "0")

    assert _load_demo_settings().SECRET_KEY == "configured-production-secret"
