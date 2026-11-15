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

## Toolbar presets

Set `toolbar_preset` globally or for an individual app:

```python
BD_EDITOR = {
    "defaults": {"toolbar_preset": "standard"},
    "apps": {
        "blog": {"toolbar_preset": "full"},
        "pages": {"toolbar_preset": "small"},
    },
}
```

- `small`: headings, basic emphasis, lists, links, and undo/redo.
- `standard` (default): small plus text/background color palettes, quotes,
  code, tables, text alignment, selected-image editing, video embeds, and the
  Text/HTML mode switch.
- `full`: standard plus underline and image upload. Upload requires the
  `images` extra and `uploads.enabled = True`.

A preset supplies a base toolbar for that settings layer. Explicit `toolbar`
flags in the same layer override its buttons. An app preset selects that
app's base toolbar, then that app's explicit flags are applied.

## Toolbar options

`toolbar` is a mapping of boolean flags:

| Key | Default | Description |
| --- | --- | --- |
| `heading` | `true` | Heading selector for paragraphs and heading levels 1-6 |
| `bold` | `true` | Bold mark |
| `italic` | `true` | Italic mark |
| `text_color` | `true` | Choose a text color from the editor palette |
| `background_color` | `true` | Highlight selected text with a background color |
| `underline` | `false` | Underline mark |
| `strike` | `true` | Strikethrough mark |
| `bullet_list` | `true` | Bulleted list |
| `ordered_list` | `true` | Numbered list |
| `blockquote` | `true` | Block quotation |
| `code_block` | `true` | Escaped code block |
| `link` | `true` | Safe link control |
| `image` | `false` | Image upload control; requires uploads and Pillow |
| `image_editing` | `true` | Edit a selected image's display size, layout, alt text, and title |
| `embed` | `true` | Embed control for enabled providers |
| `table` | `true` | Insert and edit HTML tables |
| `text_align` | `true` | Align paragraphs and headings left, center, or right |
| `source` | `true` | HTML source editing mode |
| `undo` | `true` | Undo |
| `redo` | `true` | Redo |

Toolbar visibility is a user-interface choice, not a server-side security
boundary. The sanitizer independently determines what markup is stored.
When table tools are enabled, cell/row background colors and two-color zebra
striping are available. If replacing sanitizer allowlists, retain `style` on
`td`/`th` and `background-color` in `css_properties` to preserve those colors.
Text alignment requires `text-align` in `sanitizer.css_properties` and `style`
on the allowed paragraph/heading tags. Image editing requires `img` with
`src`, `alt`, `title`, and `style` attributes (plus `width`/`height` when
resizing is enabled), and the safe CSS properties used by the selected layouts.

## Browser drafts

Drafts are opt-in and are disabled by default:

```python
BD_EDITOR = {
    "defaults": {
        "drafts": {
            "enabled": True,
            "ttl_days": 7,
        },
    },
}
```

When enabled, editor content is saved in this browser's `localStorage`, scoped
to the current admin page, model, object, and field. Drafts expire after
`ttl_days` (1-90), are cleared after a successful form submission, and are not
sent to a BD-Editor server endpoint. They may remain on shared browsers until
expiry. Do not enable this for sensitive content unless browser storage is
appropriate for your application.

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
- `allow_format_selection` (`true`): let the editor choose an output format
  from `allowed_formats`. `output_format` is the dialog's default choice.
- `allow_quality_selection` (`true`): let the editor choose JPEG/WebP quality.
- `quality` (`85`): default JPEG/WebP quality from 1 through 100.
- `min_quality` (`1`) and `max_quality` (`100`): inclusive allowed JPEG/WebP
  quality range for editor selections. The default `quality` must be within
  these bounds, which are validated and enforced by the upload endpoint.
- `show_size_estimates` (`true`): show browser-generated output-size estimates
  for available quality presets. Estimates are local and informational; the
  Pillow result may differ.
- `warn_missing_alt` (`false`): show a non-blocking reminder when an image has
  no alternative text.
- `storage_alias` (`"default"`): key in Django's `STORAGES` setting.

The package uses Django's storage API; remote storage providers, including
ImageKit-compatible backends, can be selected through `STORAGES`. BD-Editor
does not require or make network calls to a particular image service.
The image dialog proposes a quality preset based on the selected image's
dimensions and size. PNG remains lossless and does not use a JPEG/WebP quality
slider. Set `allow_format_selection` or `allow_quality_selection` to `false`
to lock the respective choice to the server configuration.

For example, set per-app quality bounds and enable the optional reminder:

```python
BD_EDITOR = {
    "apps": {
        "blog": {
            "uploads": {
                "quality": 82,
                "min_quality": 60,
                "max_quality": 92,
                "warn_missing_alt": True,
            },
        },
    },
}
```

## Image editing options

`images` controls display sizing and available placement modes, independently
of uploaded file conversion:

- `allow_resize` (`true`): show width/height controls for selected images.
- `max_width` and `max_height` (`2048` each): maximum displayed dimensions in
  pixels; each must be from 1 to 10,000. The sanitizer clamps stored image
  dimensions to these limits.
- `float_max_width_percent` (`50`): maximum width of floated images as a
  percentage of the content area; it must be an integer from 25 to 75.
- `preserve_aspect_ratio` (`true`): initially keep the image proportions while
  resizing. Authors can toggle this in the image dialog.
- `inline_vertical_alignments` (`["top", "middle", "bottom"]`): unique subset
  of `top`, `middle`, `bottom`, and `baseline` permitted for inline images.
- `default_inline_vertical_alignment` (`"top"`): initial inline alignment; it
  must appear in `inline_vertical_alignments`.
- `allowed_layouts`: unique subset of `block-left`, `block-center`,
  `block-right`, `inline`, `float-left`, and `float-right`.
- `default_layout` (`"block-left"`): initial layout; it must appear in
  `allowed_layouts`.

The block layouts put an image on its own line. `inline` places it on the
current text line; following text continues below the image when that line
fills. Choose `float-left` to wrap a paragraph on the right, or `float-right`
to wrap it on the left. Float layouts limit the image to 50% of the content
width by default; `float_max_width_percent` changes that bound. The layout and
inline text alignment controls are available in the toolbar when an image is
selected. `inline_vertical_alignments` controls how inline text aligns with
the image's top, middle, or bottom. Resizing changes the HTML display
dimensions, not the uploaded file's pixel data. These settings merge globally
and per app like other `BD_EDITOR` options. Selected images show eight drag
handles and a live dimensions/aspect-ratio readout; float layouts begin text
at the top of the image.

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

When a color toolbar button is enabled, keep the `span` tag, its `style`
attribute, and the matching `color` or `background-color` property in the
sanitizer allowlists. Configuration validation reports an error if those
requirements conflict.
Keep `img`'s `style` attribute and the relevant safe layout properties when
image editing is enabled.

Unknown keys, unsupported tags, unsafe attributes/properties, invalid types,
and contradictory toolbar/upload settings raise `ImproperlyConfigured`.

## Localization

English is the default editor UI language. `bd_editor/locale/en.json` and
`bd_editor/locale/tr.json` contain the bundled editor labels. Set
`BD_EDITOR["defaults"]["locale"]` to `"en"` or `"tr"` to force the editor
language; `None` follows Django's active language.

Server-side messages use Django catalogs under `bd_editor/locale/<language>/`.
The translated documentation is maintained in `docs/en/` and `docs/tr/`.
