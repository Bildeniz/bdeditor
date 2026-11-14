import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse


@pytest.mark.django_db
def test_admin_add_form_renders_editor_widget_and_local_assets(client):
    user = get_user_model().objects.create_superuser(
        username="admin",
        email="admin@example.test",
        password="test-password",
    )
    client.force_login(user)

    response = client.get(reverse("admin:tests_article_add"))
    page = response.content.decode()

    assert response.status_code == 200
    assert 'data-bd-editor-root' in page
    assert 'data-bd-model-label="tests.article"' in page
    assert "bd_editor/editor.css" in page
    assert "bd_editor/editor.js" in page
