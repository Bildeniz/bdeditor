from importlib.util import find_spec

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
        '<p onclick="alert(1)" style="color: #1d4ed8; background-color: #bfdbfe; position: fixed">'
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
    assert "color:#1d4ed8" in cleaned
    assert "background-color:#bfdbfe" in cleaned
    assert "position" not in cleaned


def test_inline_color_marks_are_kept_but_removed_by_style_free_helper():
    source = (
        '<p><span style="color: #1d4ed8; background-color: #fef08a">'
        "Colored text</span></p>"
    )

    sanitized = sanitize_html(source)
    style_free = only_html(source)

    assert "color:#1d4ed8" in sanitized
    assert "background-color:#fef08a" in sanitized
    assert "Colored text" in style_free
    assert "color:" not in style_free
    assert "background-color:" not in style_free


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


@override_settings(
    BD_EDITOR={"defaults": {"images": {"max_width": 640, "max_height": 480}}}
)
def test_image_layout_styles_are_safe_and_display_dimensions_are_bounded():
    cleaned = sanitize_html(
        '<p style="text-align: right">Text '
        '<img src="/media/photo.jpg" width="2400" height="1800" '
        'style="display: block; float: right; clear: none; height: auto; '
        'max-width: 50%; max-height: 480px; margin-left: 1em; '
        'margin-bottom: 0.5rem; background-image: url(https://evil.test/image)">'
        '<img src="/media/other.jpg" width="auto" height="0"></p>'
    )

    assert 'text-align:right' in cleaned
    assert 'width="640"' in cleaned
    assert 'height="480"' in cleaned
    assert "display:block" in cleaned
    assert "float:right" in cleaned
    assert "height:auto" in cleaned
    assert "max-width:50%" in cleaned
    assert "max-height:480px" in cleaned
    assert "background-image" not in cleaned
    assert 'width="auto"' not in cleaned
    assert 'height="0"' not in cleaned
    huge_dimension_value = "9" * 5000
    huge_dimension = sanitize_html(
        f'<img src="/media/photo.jpg" width="{huge_dimension_value}">'
    )
    assert "width=" not in huge_dimension


def test_style_free_helper_removes_image_layout_styles():
    cleaned = only_html(
        '<p><img src="/media/photo.jpg" style="display:block;float:right"></p>'
    )

    assert "style=" not in cleaned
    assert "<img" in cleaned


def test_text_and_background_colors_are_safe_and_style_free_helper_removes_them():
    source = (
        '<p><span style="color: #1d4ed8; background-color: #fef08a">'
        "Colored text</span></p>"
    )

    sanitized = sanitize_html(source)
    style_free = only_html(source)

    assert "color:#1d4ed8" in sanitized
    assert "background-color:#fef08a" in sanitized
    assert "Colored text" in style_free
    assert "color:" not in style_free
    assert "background-color:" not in style_free


def test_script_examples_inside_code_blocks_remain_inert_text():
    cleaned = sanitize_html(
        "<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>"
    )

    assert cleaned == "<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>"
    assert "<script>" not in cleaned


def test_table_colwidth_attributes_are_validated_before_storage():
    cleaned = sanitize_html(
        '<table><tbody><tr>'
        '<th data-colwidth="120,240">Heading</th>'
        '<td data-colwidth="120,evil">Cell</td>'
        "</tr></tbody></table>"
    )

    assert 'data-colwidth="120,240"' in cleaned
    assert "120,evil" not in cleaned


def test_table_cell_backgrounds_are_preserved_but_unsafe_styles_are_removed():
    cleaned = sanitize_html(
        '<table><tbody><tr>'
        '<th style="background-color: #fef08a">Heading</th>'
        '<td style="background-color: #bfdbfe; background-image: url(https://evil.test/x)">Cell</td>'
        '<td style="background-color: rgb(238, 238, 238)">Browser color</td>'
        "</tr></tbody></table>"
    )

    assert 'style="background-color:#fef08a"' in cleaned
    assert 'style="background-color:#bfdbfe"' in cleaned
    assert 'style="background-color:rgb(238, 238, 238)"' in cleaned
    assert "background-image" not in cleaned


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
    BD_EDITOR={"defaults": {"sanitizer": {"css_properties": ["background-color"]}}}
)
def test_color_toolbar_requires_safe_span_color_styles():
    with pytest.raises(ImproperlyConfigured, match="toolbar.text_color"):
        get_config()


@override_settings(
    BD_EDITOR={
        "defaults": {
            "toolbar": {
                "text_color": False,
                "background_color": False,
                "image_editing": False,
            },
            "sanitizer": {"css_properties": ["color"]},
        }
    }
)
def test_text_alignment_toolbar_requires_safe_text_alignment_styles():
    with pytest.raises(ImproperlyConfigured, match="toolbar.text_align"):
        get_config()


@override_settings(
    BD_EDITOR={
        "defaults": {
            "sanitizer": {
                "attributes": {"img": ["src", "alt", "title", "width", "height"]},
            }
        }
    }
)
def test_image_editing_toolbar_requires_allowed_image_styles():
    with pytest.raises(ImproperlyConfigured, match="toolbar.image_editing"):
        get_config()


@override_settings(
    BD_EDITOR={
        "defaults": {
            "images": {
                "max_width": 1200,
                "float_max_width_percent": 60,
                "allowed_layouts": ["inline"],
                "default_layout": "inline",
            }
        }
    }
)
def test_image_layouts_and_display_limits_are_configurable():
    images = get_config()["images"]

    assert images["max_width"] == 1200
    assert images["float_max_width_percent"] == 60
    assert images["allowed_layouts"] == ["inline"]
    assert images["default_layout"] == "inline"
    assert images["default_inline_vertical_alignment"] == "top"
    assert images["inline_vertical_alignments"] == ["top", "middle", "bottom"]


def test_float_image_width_limit_defaults_to_half_column():
    assert get_config()["images"]["float_max_width_percent"] == 50


@pytest.mark.parametrize("percent", [24, 76, True, 50.5, "50"])
def test_float_image_width_percent_requires_an_integer_from_25_to_75(percent):
    with override_settings(
        BD_EDITOR={"defaults": {"images": {"float_max_width_percent": percent}}}
    ):
        with pytest.raises(
            ImproperlyConfigured,
            match="must be an integer from 25 to 75",
        ):
            get_config()


@override_settings(
    BD_EDITOR={"defaults": {"images": {"allowed_layouts": ["inline"]}}}
)
def test_default_image_layout_must_be_allowed():
    with pytest.raises(ImproperlyConfigured, match="must be one of images.allowed_layouts"):
        get_config()


@override_settings(
    BD_EDITOR={
        "defaults": {
            "images": {
                "inline_vertical_alignments": ["top", "bottom"],
                "default_inline_vertical_alignment": "bottom",
            }
        }
    }
)
def test_inline_image_vertical_alignment_is_configurable():
    images = get_config()["images"]

    assert images["inline_vertical_alignments"] == ["top", "bottom"]
    assert images["default_inline_vertical_alignment"] == "bottom"


@override_settings(
    BD_EDITOR={
        "defaults": {
            "images": {
                "inline_vertical_alignments": ["top"],
                "default_inline_vertical_alignment": "middle",
            }
        }
    }
)
def test_default_inline_image_vertical_alignment_must_be_allowed():
    with pytest.raises(
        ImproperlyConfigured,
        match="must be one of images.inline_vertical_alignments",
    ):
        get_config()


@override_settings(
    BD_EDITOR={"defaults": {"images": {"max_height": 10_001}}}
)
def test_image_display_dimension_has_a_hard_upper_bound():
    with pytest.raises(ImproperlyConfigured, match="from 1 to 10000"):
        get_config()


@override_settings(
    BD_EDITOR={
        "defaults": {
            "toolbar_preset": "small",
            "toolbar": {"underline": True},
        },
        "apps": {
            "article_b": {
                "toolbar_preset": "standard",
                "toolbar": {"heading": False},
            }
        },
    }
)
def test_toolbar_presets_keep_partial_global_and_app_overrides():
    compact = get_config()
    app_config = get_config("article_b")

    assert compact["toolbar_preset"] == "small"
    assert compact["toolbar"]["table"] is False
    assert compact["toolbar"]["text_color"] is False
    assert compact["toolbar"]["text_align"] is False
    assert compact["toolbar"]["image_editing"] is False
    assert compact["toolbar"]["underline"] is True
    assert app_config["toolbar_preset"] == "standard"
    assert app_config["toolbar"]["table"] is True
    assert app_config["toolbar"]["text_color"] is True
    assert app_config["toolbar"]["background_color"] is True
    assert app_config["toolbar"]["text_align"] is True
    assert app_config["toolbar"]["image_editing"] is True
    assert app_config["toolbar"]["heading"] is False
    assert app_config["drafts"] == {"enabled": False, "ttl_days": 7}


@pytest.mark.skipif(
    find_spec("PIL") is None,
    reason="Pillow is optional",
)
@override_settings(
    BD_EDITOR={
        "apps": {
            "article_b": {
                "toolbar_preset": "full",
                "uploads": {"enabled": True},
            }
        }
    }
)
def test_full_toolbar_preset_includes_image_upload_controls():
    full = get_config("article_b")

    assert full["toolbar_preset"] == "full"
    assert full["toolbar"]["image"] is True
    assert full["toolbar"]["image_editing"] is True
    assert full["toolbar"]["underline"] is True
    assert full["uploads"]["enabled"] is True


@override_settings(BD_EDITOR={"defaults": {"drafts": {"ttl_days": 91}}})
def test_draft_retention_limit_is_validated():
    with pytest.raises(ImproperlyConfigured, match="from 1 to 90"):
        get_config()


@override_settings(
    BD_EDITOR={"defaults": {"uploads": {"max_file_size": 100 * 1024 * 1024 + 1}}}
)
def test_upload_byte_limit_has_a_hard_upper_bound():
    with pytest.raises(ImproperlyConfigured, match="must not exceed"):
        get_config()


@override_settings(
    BD_EDITOR={"defaults": {"uploads": {"min_quality": 55, "max_quality": 90, "quality": 75}}}
)
def test_image_quality_range_can_be_configured():
    uploads = get_config()["uploads"]

    assert uploads["min_quality"] == 55
    assert uploads["max_quality"] == 90
    assert uploads["quality"] == 75
    assert uploads["show_size_estimates"] is True
    assert uploads["warn_missing_alt"] is False


@override_settings(
    BD_EDITOR={"defaults": {"uploads": {"min_quality": 91, "max_quality": 90}}}
)
def test_image_quality_range_must_be_ordered():
    with pytest.raises(ImproperlyConfigured, match="must not exceed"):
        get_config()


@override_settings(
    BD_EDITOR={"defaults": {"uploads": {"min_quality": 60, "max_quality": 90, "quality": 55}}}
)
def test_default_image_quality_must_be_inside_configured_range():
    with pytest.raises(ImproperlyConfigured, match="within the configured"):
        get_config()


@override_settings(BD_EDITOR={"defaults": {"uploads": {"warn_missing_alt": "yes"}}})
def test_image_alt_warning_configuration_requires_a_boolean():
    with pytest.raises(ImproperlyConfigured, match="must be a boolean"):
        get_config()


@override_settings(
    BD_EDITOR={
        "apps": {
            "article_a": {
                "toolbar": {
                    "text_color": False,
                    "background_color": False,
                    "image_editing": False,
                },
                "sanitizer": {"tags": ["p", "strong"]},
            }
        }
    }
)
def test_template_render_filter_accepts_app_specific_sanitizer():
    assert bd_richtext(
        "<p><u>text</u></p>",
        "article_a",
    ) == "<p>text</p>"


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
