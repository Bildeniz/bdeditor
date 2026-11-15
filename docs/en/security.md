# Security model and limitations

BD-Editor is designed to reduce the chance that rich-text content becomes an
XSS or unsafe-upload vector. It is not a substitute for application-level
authorization, safe template practices, CSP, or database access controls.

## Content processing

The browser editor uses locally bundled Tiptap/ProseMirror assets; it does not
load JavaScript from a CDN. Browser-side checks improve usability only. The
Python sanitizer based on `nh3` is authoritative on Django forms, model field
preparation, ORM reads, and template rendering.

The sanitizer:

- removes script/style/object/embed/video/audio/source elements and their
  contents;
- drops event-handler attributes such as `onclick` and `onerror`;
- accepts only explicitly supported tags and attributes;
- allows only `http`, `https`, `mailto`, and `tel` URL schemes by default;
- filters inline styles by an explicit CSS property allowlist, excluding
  resource-loading and executable CSS constructs;
- adds defensive `rel` values to links and does not permit user-selected link
  targets;
- never treats code-block contents as executable HTML.

The source editor is a textarea. Its contents are parsed through the editor's
document schema and sanitized again by Django. Script-like code examples must
be entered as text in a code block; an actual `<script>` element is removed.

## Video embeds

Video uploads are not supported. The built-in embed control accepts YouTube
and/or Vimeo URLs only when that provider is enabled. The server validates
exact hostnames and video identifiers, then emits a canonical HTTPS embed URL.
`srcdoc`, arbitrary iframe hosts, user-provided `allow` values, event
attributes, and executable URL schemes are discarded. The iframe receives
fixed permissions and a sandbox.

An enabled provider's remote video player can run its own code inside the
cross-origin iframe. Disable embeds and their toolbar control if policy
requires no third-party content at all.

## Image uploads

The image endpoint requires an authenticated active staff user, add/change
permission for the associated model, and Django CSRF protection. It checks the
request and file byte limits, decodes the file with Pillow, checks the actual image format and pixel count, applies EXIF
orientation, re-encodes to the configured raster format, strips metadata, and
uses a generated storage name. Client filenames and MIME declarations are
not trusted. SVG, video, and other non-raster formats are rejected.

The application still needs appropriate web-server and storage limits. For
production, serve user media from a separate origin where practical, configure
your reverse proxy's request-body limit, and use a storage backend with
appropriate access controls.

The editor's resize controls change HTML display dimensions, not stored pixel
data. The `images.max_width` and `images.max_height` settings bound those
dimensions on the server. Alignment and text-wrapping modes use only CSS
properties in the server-side allowlist; the editor toolbar is not a security
boundary.

## Browser drafts

Draft persistence is disabled by default. When enabled, draft text (including
HTML source mode) is saved in browser `localStorage`, scoped to the current
page, model, object, and field, and expires after the configured retention
period. It is not uploaded to a draft endpoint. A browser profile shared by
multiple people can expose locally stored draft content to another person
using the same profile. Do not enable this unless browser-side storage is
appropriate for the content and users. Draft data is cleared after successful
form submission; drafts from failed form submissions remain available.

## Database and rendering boundary

`RichTextField` sanitizes Django-managed field/form/ORM paths, including
`save()`, `QuerySet.update()`, and bulk field operations covered by tests. ORM
reads are sanitized as well. **Direct SQL, database console edits, other
services, and code that writes around the field bypass write-time
sanitization.** The library cannot intercept those paths.

For HTML output use `bd_richtext` or `bd_only_html`; these filters sanitize
before marking content safe. Do not use `mark_safe`, Django's `safe` filter, or
an equivalent bypass on unsanitized values. Applications should also enable a
strict Content Security Policy appropriate to their own pages.

## Configuration is not an escape hatch

Settings can narrow allowed tags, attributes, URL schemes, CSS properties,
toolbar actions, upload limits, output formats, and providers. They cannot
enable script tags, event handlers, arbitrary iframe attributes, executable
URL schemes, video uploads, or unsafe CSS properties. Invalid values raise
`ImproperlyConfigured`.

This design limits common accidental unsafe choices; it does not guarantee
that every third-party storage backend, browser extension, downstream template,
or application-specific integration is safe. Keep BD-Editor and its
dependencies updated and review security advisories.
