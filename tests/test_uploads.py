import io

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from PIL import Image


def _png_bytes(size=(4, 3)):
    output = io.BytesIO()
    Image.new("RGBA", size, (20, 80, 140, 180)).save(output, format="PNG")
    return output.getvalue()


def _enable_uploads(settings, **upload_options):
    settings.BD_EDITOR = {
        "defaults": {
            "toolbar": {"image": True},
            "uploads": {"enabled": True, **upload_options},
        }
    }


@pytest.mark.django_db
def test_staff_can_upload_and_reencode_image(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    _enable_uploads(settings, output_format="JPEG")
    user = get_user_model().objects.create_superuser(
        username="editor",
        email="editor@example.test",
        password="test-password",
    )
    client = Client()
    client.force_login(user)

    response = client.post(
        "/bd-editor/upload/",
        {
            "image": SimpleUploadedFile(
                "cover.png",
                _png_bytes(),
                content_type="image/png",
            ),
            "app_label": "tests",
            "model_label": "tests.article",
        },
    )

    assert response.status_code == 201
    result = response.json()
    assert result["format"] == "JPEG"
    assert result["width"] == 4
    assert result["height"] == 3
    stored_path = tmp_path / result["url"].lstrip("/")
    with Image.open(stored_path) as stored:
        assert stored.format == "JPEG"


@pytest.mark.django_db
def test_staff_can_choose_an_allowed_image_format_and_quality(settings, monkeypatch):
    _enable_uploads(settings, output_format="JPEG")
    user = get_user_model().objects.create_superuser(
        username="format-editor",
        email="format-editor@example.test",
        password="test-password",
    )
    client = Client()
    client.force_login(user)
    captured = {}

    def fake_store(uploaded_file, config):
        captured["output_format"] = config["output_format"]
        captured["quality"] = config["quality"]
        return {"url": "/bd_editor/images/example.webp", "width": 4, "height": 3, "format": "WEBP"}

    monkeypatch.setattr("bd_editor.views.store_uploaded_image", fake_store)
    response = client.post(
        "/bd-editor/upload/",
        {
            "image": SimpleUploadedFile("cover.png", _png_bytes(), content_type="image/png"),
            "app_label": "tests",
            "model_label": "tests.article",
            "format": "WEBP",
            "quality": "61",
        },
    )

    assert response.status_code == 201
    assert captured == {"output_format": "WEBP", "quality": 61}


@pytest.mark.django_db
def test_upload_rejects_a_client_selected_format_when_configuration_locks_it(settings):
    _enable_uploads(
        settings,
        output_format="JPEG",
        allow_format_selection=False,
    )
    user = get_user_model().objects.create_superuser(
        username="locked-format-editor",
        email="locked-format-editor@example.test",
        password="test-password",
    )
    client = Client()
    client.force_login(user)

    response = client.post(
        "/bd-editor/upload/",
        {
            "image": SimpleUploadedFile("cover.png", _png_bytes(), content_type="image/png"),
            "app_label": "tests",
            "model_label": "tests.article",
            "format": "WEBP",
        },
    )

    assert response.status_code == 400
    assert "fixed" in response.json()["error"].lower()


@pytest.mark.django_db
def test_upload_rejects_out_of_range_client_quality(settings):
    _enable_uploads(settings)
    user = get_user_model().objects.create_superuser(
        username="quality-editor",
        email="quality-editor@example.test",
        password="test-password",
    )
    client = Client()
    client.force_login(user)

    response = client.post(
        "/bd-editor/upload/",
        {
            "image": SimpleUploadedFile("cover.png", _png_bytes(), content_type="image/png"),
            "app_label": "tests",
            "model_label": "tests.article",
            "quality": "101",
        },
    )

    assert response.status_code == 400
    assert "quality" in response.json()["error"].lower()


@pytest.mark.django_db
def test_upload_rejects_quality_outside_the_configured_range(settings):
    _enable_uploads(settings, min_quality=55, max_quality=90, quality=75)
    user = get_user_model().objects.create_superuser(
        username="bounded-quality-editor",
        email="bounded-quality@example.test",
        password="test-password",
    )
    client = Client()
    client.force_login(user)

    response = client.post(
        "/bd-editor/upload/",
        {
            "image": SimpleUploadedFile("cover.png", _png_bytes(), content_type="image/png"),
            "app_label": "tests",
            "model_label": "tests.article",
            "quality": "54",
        },
    )

    assert response.status_code == 400
    assert "quality" in response.json()["error"].lower()


@pytest.mark.django_db
def test_upload_rejects_quality_when_configuration_locks_it(settings):
    _enable_uploads(settings, allow_quality_selection=False)
    user = get_user_model().objects.create_superuser(
        username="fixed-quality-editor",
        email="fixed-quality-editor@example.test",
        password="test-password",
    )
    client = Client()
    client.force_login(user)

    response = client.post(
        "/bd-editor/upload/",
        {
            "image": SimpleUploadedFile("cover.png", _png_bytes(), content_type="image/png"),
            "app_label": "tests",
            "model_label": "tests.article",
            "quality": "61",
        },
    )

    assert response.status_code == 400
    assert "fixed" in response.json()["error"].lower()


@pytest.mark.django_db
def test_non_staff_users_cannot_upload_images(settings):
    _enable_uploads(settings)
    user = get_user_model().objects.create_user(username="visitor", password="test-password")
    client = Client()
    client.force_login(user)

    response = client.post(
        "/bd-editor/upload/",
        {"image": SimpleUploadedFile("cover.png", _png_bytes(), content_type="image/png")},
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_staff_without_model_permission_cannot_upload(settings):
    _enable_uploads(settings)
    user = get_user_model().objects.create_user(
        username="staff-without-model-permission",
        password="test-password",
        is_staff=True,
    )
    client = Client()
    client.force_login(user)

    response = client.post(
        "/bd-editor/upload/",
        {
            "image": SimpleUploadedFile("cover.png", _png_bytes(), content_type="image/png"),
            "app_label": "tests",
            "model_label": "tests.article",
        },
    )

    assert response.status_code == 403
    assert "model" in response.json()["error"].lower()


@pytest.mark.django_db
def test_upload_requires_csrf_token(settings):
    _enable_uploads(settings)
    user = get_user_model().objects.create_user(
        username="staff",
        email="staff@example.test",
        password="test-password",
        is_superuser=True,
        is_staff=True,
        is_active=True,
    )
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)

    response = client.post(
        "/bd-editor/upload/",
        {
            "image": SimpleUploadedFile("cover.png", _png_bytes(), content_type="image/png"),
            "app_label": "tests",
            "model_label": "tests.article",
        },
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_video_upload_is_rejected_by_decoded_image_validation(settings):
    _enable_uploads(settings)
    user = get_user_model().objects.create_user(
        username="staff",
        email="staff@example.test",
        password="test-password",
        is_superuser=True,
        is_staff=True,
        is_active=True,
    )
    client = Client()
    client.force_login(user)

    response = client.post(
        "/bd-editor/upload/",
        {
            "image": SimpleUploadedFile(
                "movie.mp4",
                b"\x00\x00\x00\x18ftypmp42not-an-image",
                content_type="video/mp4",
            ),
            "app_label": "tests",
            "model_label": "tests.article",
        },
    )

    assert response.status_code == 400
    assert "image" in response.json()["error"].lower()


@pytest.mark.django_db
def test_pixel_limit_is_enforced(settings):
    _enable_uploads(settings, max_image_pixels=4)
    user = get_user_model().objects.create_user(
        username="staff",
        email="staff@example.test",
        password="test-password",
        is_superuser=True,
        is_staff=True,
        is_active=True,
    )
    client = Client()
    client.force_login(user)

    response = client.post(
        "/bd-editor/upload/",
        {
            "image": SimpleUploadedFile("large.png", _png_bytes((3, 3)), content_type="image/png"),
            "app_label": "tests",
            "model_label": "tests.article",
        },
    )

    assert response.status_code == 400
    assert "pixel" in response.json()["error"].lower()
