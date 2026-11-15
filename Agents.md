# Agent and contributor guide

## Project boundaries

BD-Editor is an installable Django application, distributed as `bd-editor` and
imported as `bd_editor`. Keep runtime Python dependencies small. Browser assets
must be bundled with the package; do not load scripts or styles from a CDN.
Package metadata and build configuration live in `pyproject.toml`; the
public-facing overview is `README.md`, and release notes are kept in
`CHANGELOG.md`.

## Important modules

- `bd_editor/conf.py` validates built-in, global, and per-app settings,
  including image-quality bounds and image display/layout options.
- `bd_editor/sanitizer.py` owns HTML cleaning and plain-text helpers.
- `bd_editor/fields.py` applies sanitization to the Django model field.
- `bd_editor/uploads.py` contains the optional Pillow image pipeline.
- `bd_editor/locale/` stores editor JSON labels and Django message catalogs.
- `frontend/src/editor.js` is the Tiptap-based browser editor source, including
  table-cell styling, text alignment, bounded image resize handles, image
  layout editing, and local image-size estimates. Inline images stay on one
  text line; float layouts reserve `images.float_max_width_percent` of the
  content width so adjacent text can wrap. Keep image flow and inline alignment
  controls in the selected-image toolbar, and keep resize controls editor-scoped
  and within configured image bounds. Build its static bundle.
- Keep document typography and color styles scoped to the editor content
  surface, separate from Django admin styles.
- `bd_editor/static/bd_editor/THIRD_PARTY_NOTICES.txt` includes bundled
  frontend component licenses.
- The public two-app demo lives under `demo/`; its localized article index,
  configuration descriptions, and Django catalogs are source-distribution
  content, not runtime package dependencies.

## Security invariants

- Treat editor input, pasted HTML, URLs, uploaded files, and settings as
  untrusted.
- Enforce the HTML allowlist on the server with the selected `nh3` sanitizer.
  Never allow `script` elements,
  inline event handlers, executable URL schemes, arbitrary iframes, or video
  uploads.
- Embeds must be normalized for explicitly supported providers. Do not accept
  arbitrary iframe hosts or user-provided iframe permissions.
- Restrict CSS to a safe property allowlist; never allow CSS capable of loading
  remote resources.
- Text alignment and image layout styles must use the existing server-side CSS
  allowlist; configured image dimensions must also be bounded by the sanitizer.
- Table cell and row colors must be represented using the existing
  `background-color` CSS allowlist on individual `td`/`th` cells. Image quality
  limits (`uploads.min_quality`/`uploads.max_quality`) must be validated on
  the server as well as reflected in the editor; browser-side size estimates
  are local and informational only.
- Accessibility warnings for missing image alt text must remain opt-in and
  non-blocking.
- Validate images by their decoded content, size, and pixel dimensions. Use
  generated storage names rather than client-supplied paths.
- Optional editor drafts are stored only in browser localStorage and must stay
  opt-in with a documented expiration and shared-browser privacy warning.
- Persist the demo's development `SECRET_KEY` in its gitignored key file so
  autoreloads preserve sessions. Production mode must require an explicit
  `DJANGO_SECRET_KEY`.
- Protect image uploads with CSRF, an active staff check, and add/change
  permission for the associated model.
- Only mark sanitized output safe in the dedicated template integration.
  Document that raw SQL and direct database writes bypass Django field
  validation.
- Invalid security-sensitive configuration must raise a clear error; do not
  silently widen an allowlist or fall back to unsafe output.

## Development workflow

- Python package metadata is in `pyproject.toml`; Django code lives in
  `bd_editor/`.
- Frontend source and its lockfile live in `frontend/`; generated, locally
  bundled assets belong under `bd_editor/static/bd_editor/`.
- Run focused tests with `python -m pytest`.
- The current compatibility matrix covers Django 5.2, 6.0, and 6.1 on valid
  Python versions; do not test unsupported Python/Django pairs.
- Build and inspect distributions with `python -m build` and
  `python -m twine check dist/*`.
- Build frontend assets with `npm --prefix frontend run build`.
- Regenerate bundled license notices with
  `python scripts/generate_third_party_notices.py` after changing frontend
  dependencies.
- Compile Django message catalogs with `python scripts/compile_translations.py`.
- Demo UI templates and localized catalogs live under `demo/templates/` and
  `demo/locale/`; the catalog compiler handles both demo and package messages.
- Keep compatibility tests limited to valid Django/Python combinations.
- Add English comments for non-obvious security and integration decisions, not
  for routine code.
- After each meaningful implementation milestone, update both `Agents.md` and
  `Progress.md` before moving to the next milestone.

## Release checklist

- Run tests and linting, build frontend assets, build wheel and sdist, inspect
  bundled static files, and verify package metadata.
- Update `CHANGELOG.md` and the project version in `pyproject.toml` for each
  release. Push a matching `v<version>` tag to run the Trusted Publishing
  workflow; configure the PyPI trusted publisher for
  `.github/workflows/publish.yml` and the `pypi` GitHub environment first.
- Compile locale catalogs and regenerate third-party license notices after
  changing translations or frontend dependencies.
- Retain notices for all bundled third-party assets and confirm the selected
  packages' licenses before upgrading them.
- Do not publish a release or upload credentials as part of local validation.
