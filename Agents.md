# Agent and contributor guide

## Project boundaries

BD-Editor is an installable Django application, distributed as `bd-editor` and
imported as `bd_editor`. Keep runtime Python dependencies small. Browser assets
must be bundled with the package; do not load scripts or styles from a CDN.
Package metadata and build configuration live in `pyproject.toml`; the
public-facing overview is `README.md`.

## Important modules

- `bd_editor/conf.py` validates built-in, global, and per-app settings.
- `bd_editor/sanitizer.py` owns HTML cleaning and plain-text helpers.
- `bd_editor/fields.py` applies sanitization to the Django model field.
- `bd_editor/uploads.py` contains the optional Pillow image pipeline.
- `bd_editor/locale/` stores editor JSON labels and Django message catalogs.
- `frontend/src/editor.js` is the Tiptap-based browser editor source. Build its
  local static bundle before packaging.

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
- Validate images by their decoded content, size, and pixel dimensions. Use
  generated storage names rather than client-supplied paths.
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
- Keep compatibility tests limited to valid Django/Python combinations.
- Add English comments for non-obvious security and integration decisions, not
  for routine code.
- After each meaningful implementation milestone, update both `Agents.md` and
  `Progress.md` before moving to the next milestone.

## Release checklist

- Run tests and linting, build frontend assets, build wheel and sdist, inspect
  bundled static files, and verify package metadata.
- Compile locale catalogs and regenerate third-party license notices after
  changing translations or frontend dependencies.
- Retain notices for all bundled third-party assets and confirm the selected
  packages' licenses before upgrading them.
- Do not publish a release or upload credentials as part of local validation.
