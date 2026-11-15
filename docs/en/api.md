# API reference

## `RichTextField`

```python
from bd_editor.fields import RichTextField

class Article(models.Model):
    body = RichTextField()
```

`RichTextField` is a `TextField` subclass. It sanitizes values during field
conversion, model saves, database preparation (including ORM update/bulk
operations), and when values are loaded through the Django ORM. Its
`ModelForm` and Django admin widget are configured automatically using the
model's `app_label`.

## `RichTextFormField` and `BDRichTextWidget`

For standalone forms, import `RichTextFormField` from `bd_editor.forms`. The
widget is `BDRichTextWidget` from `bd_editor.widgets`; it ships locally
packaged JavaScript and CSS and falls back to a plain textarea when JavaScript
is unavailable.

Include `bd_editor.urls` in the root URLconf to enable the optional image
upload endpoint. The endpoint accepts CSRF-protected image uploads only from
active staff users who also have add/change permission for the field's model.
Standalone upload-enabled forms must provide a model label to the widget.

## Toolbar presets and tables

Set `toolbar_preset` to `small`, `standard`, or `full` globally or per app.
Then apply individual boolean `toolbar` overrides. The standard and full
profiles include a table insert action. When the cursor is inside a table, the
editor exposes contextual commands to insert/delete rows and columns, toggle a
header row, or delete the table. The same toolbar can apply a custom background
color to the current cell or row, clear it, or stripe alternating rows with
two chosen colors. These styles are stored as cell-level `background-color`
styles and remain subject to the resolved sanitizer allowlist.

## Text alignment and image editing

The `text_align` toolbar option adds a left/center/right selector for the
current paragraph or heading. When `image_editing` is enabled, selecting an
image exposes a dialog to change its displayed dimensions, alt text, title,
and placement. Layouts can put the image on its own left/center/right line,
inline with text, or float it left/right so nearby text wraps around it.
Selected images also expose draggable resize handles with a live dimensions
and aspect-ratio readout. Inline images can be aligned to the top, middle, or
bottom of the text line; float layouts let adjacent text start at the top.
Image dimensions are display attributes; this does not resize or re-encode the
stored file. The resolved sanitizer bounds width and height and filters image
styles through its CSS allowlist.

## Sanitization helpers

```python
from bd_editor.sanitizer import clean_text, only_html, sanitize_html

safe_fragment = sanitize_html(untrusted_html, app_label="blog")
style_free_fragment = only_html(untrusted_html, app_label="blog")
plain_text = clean_text(untrusted_html, app_label="blog")
```

- `sanitize_html(value, *, app_label=None)` returns an allowlisted HTML
  fragment. Styles and embeds follow the resolved configuration.
- `only_html(value, *, app_label=None)` returns allowlisted HTML with all
  inline style attributes removed.
- `clean_text(value, *, app_label=None)` removes markup and returns normalized
  plain text.

All accept `str` or `None`; other types raise `TypeError`. For template output,
prefer `bd_richtext` or `bd_only_html`, which sanitize before marking output
safe. Do not apply Django's `safe` filter to untrusted content.

## Template filters

```django
{% load bd_editor_tags %}

{{ value|bd_richtext:"blog" }}
{{ value|bd_only_html:"blog" }}
{{ value|bd_clean_text:"blog" }}
```

Pass the model's `app_label` to the filters when app-specific sanitizer
settings are in use. The argument can be omitted to use the global
configuration.

## Embed URL helper

`bd_editor.embeds.canonicalize_embed_url(value, providers)` returns a canonical
HTTPS URL for an enabled YouTube or Vimeo video, or `None` if the URL is not
valid. The sanitizer uses this helper for iframe sources. It is not a
replacement for server-side sanitization of other HTML.
