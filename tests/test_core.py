import pytest
from django.core.exceptions import ImproperlyConfigured
from django.db import connection
from django.forms import modelform_factory
from django.test import override_settings
from django.utils.translation import gettext, override

from bd_editor.conf import get_config
from bd_editor.fields import RichTextField
from bd_editor.sanitizer import clean_text, only_html, sanitize_html
from bd_editor.templatetags.bd_editor_tags import bd_richtext
from bd_editor.widgets import BDRichTextWidget
from tests.models import Article


def test_sanitizer_removes_executable_markup_and_unsafe_css():
    source = (
        '<p onclick="alert(1)" style="color: red; position: fixed">'
        "Safe<script>alert(2)</script>"
        '<a href="javascript:alert(3)">link</a>'
        '<img src="x" onerror="alert(4)"></p>'
    )

    cleaned = sanitize_html(source)

    assert "<script" not in cleaned
    assert "alert(" not in cleaned
    assert "onclick" not in cleaned
    assert "onerror" not in cleaned
    assert "javascript:" not in cleaned
    assert "color:red" in cleaned
    assert "position" not in cleaned


def test_video_iframe_is_canonicalized_only_for_an_enabled_provider():
    safe = sanitize_html(
        '<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ" '
        'onload="alert(1)" srcdoc="<script>alert(2)</script>"></iframe>'
    )
    unsafe = sanitize_html(
        '<iframe src="https://youtube.com.attacker.invalid/embed/dQw4w9WgXcQ"></iframe>'
    )

    assert 'src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"' in safe
    assert "onload" not in safe
    assert "srcdoc" not in safe
    assert 'src="https://youtube.com.attacker.invalid' not in unsafe
    assert "sandbox=" in safe


def test_helpers_return_plain_text_and_style_free_html():
    source = '<p style="color:red">Hello <strong>world</strong></p><p>Next</p>'

    assert only_html(source) == "<p>Hello <strong>world</strong></p><p>Next</p>"
    assert clean_text(source) == "Hello world\nNext"


def test_script_examples_inside_code_blocks_remain_inert_text():
    cleaned = sanitize_html(
        "<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>"
    )

    assert cleaned == "<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>"
    assert "<script>" not in cleaned


@override_settings(
    BD_EDITOR={
        "defaults": {"toolbar": {"heading": True, "underline": False}},
        "apps": {
            "article_a": {"toolbar": {"heading": True, "underline": False}},
            "article_b": {"toolbar": {"heading": False, "underline": True}},
        },
    }
)
def test_global_and_app_specific_toolbar_overrides_merge():
    global_config = get_config()
    app_a_config = get_config("article_a")
    app_b_config = get_config("article_b")

    assert global_config["toolbar"]["heading"] is True
    assert global_config["toolbar"]["underline"] is False
    assert app_a_config["toolbar"]["heading"] is True
    assert app_a_config["toolbar"]["underline"] is False
    assert app_b_config["toolbar"]["heading"] is False
    assert app_b_config["toolbar"]["underline"] is True


@override_settings(BD_EDITOR={"defaults": {"sanitizer": {"tags": ["p", "script"]}}})
def test_unsafe_tags_cannot_be_enabled_by_settings():
    with pytest.raises(ImproperlyConfigured, match="unsupported or unsafe tags"):
        get_config()


@override_settings(BD_EDITOR={"defaults": {"toolbar": {"not_a_button": True}}})
def test_unknown_configuration_is_rejected():
    with pytest.raises(ImproperlyConfigured, match="unknown option"):
        get_config()


@override_settings(
    BD_EDITOR={"defaults": {"uploads": {"max_file_size": 100 * 1024 * 1024 + 1}}}
)
def test_upload_byte_limit_has_a_hard_upper_bound():
    with pytest.raises(ImproperlyConfigured, match="must not exceed"):
        get_config()


@override_settings(
    BD_EDITOR={"apps": {"article_a": {"sanitizer": {"tags": ["p", "strong"]}}}}
)
def test_template_render_filter_accepts_app_specific_sanitizer():
    assert bd_richtext("<p><u>text</u></p>", "article_a") == "<p>text</p>"


def test_model_field_is_a_textfield_and_uses_the_editor_widget():
    form_class = modelform_factory(Article, fields=["body"])

    assert isinstance(Article._meta.get_field("body"), RichTextField)
    assert isinstance(form_class().fields["body"].widget, BDRichTextWidget)


@pytest.mark.django_db
def test_field_sanitizes_save_update_bulk_and_database_reads():
    article = Article.objects.create(
        body='<p onclick="alert(1)">first<script>alert(2)</script></p>'
    )
    assert "onclick" not in article.body
    assert "alert(" not in article.body

    Article.objects.filter(pk=article.pk).update(body='<p onmouseover="x">second</p>')
    article.refresh_from_db()
    assert article.body == "<p>second</p>"

    article.body = '<p onfocus="x">third</p>'
    Article.objects.bulk_update([article], ["body"])
    article.refresh_from_db()
    assert article.body == "<p>third</p>"

    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE tests_article SET body = %s WHERE id = %s",
            ['<p onclick="x">fourth<script>x</script></p>', article.pk],
        )
    assert Article.objects.values_list("body", flat=True).get(pk=article.pk) == "<p>fourth</p>"

    bulk_article = Article(body='<p onfocus="x">bulk</p>')
    Article.objects.bulk_create([bulk_article])
    assert Article.objects.get(pk=bulk_article.pk).body == "<p>bulk</p>"


@pytest.mark.django_db
def test_form_field_sanitizes_submitted_html():
    form_class = modelform_factory(Article, fields=["body"])
    form = form_class(data={"body": '<p onerror="x">safe<script>x</script></p>'})

    assert form.is_valid()
    assert form.cleaned_data["body"] == "<p>safe</p>"


def test_turkish_server_catalog_is_available():
    with override("tr"):
        assert (
            gettext("The image exceeds the configured pixel limit.")
            == "Görsel, yapılandırılmış piksel sınırını aşıyor."
        )
