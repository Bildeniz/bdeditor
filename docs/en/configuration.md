# Configuration reference

All settings live under `BD_EDITOR` in Django settings:

```python
BD_EDITOR = {
    "defaults": {
        # Global defaults and limits.
    },
    "apps": {
        "blog": {
            # Overrides for models whose app_label is "blog".
        },
    },
}
```

Resolution order is built-in defaults, then `defaults`, then the matching
`apps[app_label]`. Nested mappings merge recursively; a list replaces the
previous list. An app can change one toolbar button without repeating the
other toolbar options. App labels must refer to installed Django apps.

## Toolbar options

`toolbar` is a mapping of boolean flags:

| Key | Default | Description |
| --- | --- | --- |
| `heading` | `true` | Heading selector for paragraphs and heading levels 1-6 |
| `bold` | `true` | Bold mark |
| `italic` | `true` | Italic mark |
| `underline` | `false` | Underline mark |
| `strike` | `true` | Strikethrough mark |
| `bullet_list` | `true` | Bulleted list |
| `ordered_list` | `true` | Numbered list |
| `blockquote` | `true` | Block quotation |
| `code_block` | `true` | Escaped code block |
| `link` | `true` | Safe link control |
| `image` | `false` | Image upload control; requires uploads and Pillow |
| `embed` | `true` | Embed control for enabled providers |
| `source` | `true` | HTML source editing mode |
| `undo` | `true` | Undo |
| `redo` | `true` | Redo |

Toolbar visibility is a user-interface choice, not a server-side security
boundary. The sanitizer independently determines what markup is stored.

## Upload options

`uploads` supports:

- `enabled` (`false`): enable the image upload endpoint and image toolbar
  capability. Enabling it requires `pip install "bd-editor[images]"`.
- `max_file_size` (5 MiB): maximum accepted image size in bytes; hard limit
  100 MiB.
- `max_image_pixels` (20 million): maximum decoded width multiplied by height;
  hard limit 50 million.
- `output_format` (`"keep"`): `keep`, `JPEG`, `PNG`, or `WEBP`.
- `allowed_formats` (`["JPEG", "PNG", "WEBP"]`): decoded input and output image
  formats.
- `quality` (`85`): JPEG/WebP quality from 1 through 100.
- `storage_alias` (`"default"`): key in Django's `STORAGES` setting.

The package uses Django's storage API; remote storage providers, including
ImageKit-compatible backends, can be selected through `STORAGES`. BD-Editor
does not require or make network calls to a particular image service.

## Embed providers

`embeds.providers` is a list containing `youtube`, `vimeo`, or both. The
default is `["youtube"]`. URLs are checked against exact provider hostnames and
converted to canonical HTTPS embed URLs. Arbitrary hostnames, iframe
permissions, and `srcdoc` are not configurable.

## Sanitizer options

`sanitizer` supports:

- `tags`: a replacement list of supported safe HTML tags. Script-capable tags
  can never be added.
- `attributes`: per-tag attribute lists. Values must be subsets of BD-Editor's
  safe attribute sets; event handlers and arbitrary iframe attributes cannot
  be enabled.
- `css_properties`: replacement list of safe inline CSS property names.
- `url_schemes`: a subset of `http`, `https`, `mailto`, and `tel`.
- `allow_relative_urls` (`true`): retain relative links and image paths.

For example:

```python
BD_EDITOR = {
    "defaults": {
        "sanitizer": {
            "css_properties": ["color", "background-color", "font-size", "text-align"],
            "url_schemes": ["https", "mailto"],
        },
    },
}
```

Unknown keys, unsupported tags, unsafe attributes/properties, invalid types,
and contradictory toolbar/upload settings raise `ImproperlyConfigured`.

## Localization

English is the default editor UI language. `bd_editor/locale/en.json` and
`bd_editor/locale/tr.json` contain the bundled editor labels. Set
`BD_EDITOR["defaults"]["locale"]` to `"en"` or `"tr"` to force the editor
language; `None` follows Django's active language.

Server-side messages use Django catalogs under `bd_editor/locale/<language>/`.
The translated documentation is maintained in `docs/en/` and `docs/tr/`.
