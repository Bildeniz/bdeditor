# BD-Editor progress

## Current status

- Milestone 1: complete.
- Milestone 2: complete.
- Milestone 3: complete.
- Milestone 4: complete.
- Milestone 5: complete.
- Milestone 6: complete.
- Follow-up admin and demo UX changes: complete.
- Demo autoreload session-key fix: complete.
- Editor content-style isolation, full-width layout, and color palettes: complete.
- Trusted PyPI publishing workflow and linked release changelog: complete;
  PyPI/GitHub Trusted Publisher configuration remains an owner-side setup step.

## Completed milestones

- Added the initial PyPI metadata, MIT license, package entry point, and
  contributor/security guide.
- Implemented validated global/per-app settings, HTML helpers, the
  `RichTextField`, form/widget integration, uploads and embeds.
- Added focused sanitizer, ORM, form, CSRF, model-permission, and
  image-conversion tests.
- Built and headlessly smoke-tested the local Tiptap editor, including toolbar,
  source mode, and inert script-like code samples.
- Added English/Turkish editor strings and Django catalogs.
- Added the two-app demo, migrations, English/Turkish guides, and Django
  catalog compilation. The demo passes Django checks and migrations.
- Built and validated the universal wheel and source distribution; Twine
  metadata checks pass and the wheel contains the required static, template,
  and localization assets.
- The 35-test suite passes on Python 3.14 with Django 6.1.3; the
  earlier 20-test suite also passed on Django 5.2.19, 6.0.10, and
  6.1.3. CI is configured for the supported Python/Django combinations.
- Added `small`, `standard`, and `full` toolbar presets with app-level
  overrides, editable HTML tables, and an opt-in localStorage draft setting.
- Added icon-based CKEditor-style toolbar rows, modal link/image/video/table
  workflows, and server-validated per-upload image format/quality choices.
- Added focused tests for profile resolution, table attributes, and image
  format/quality selection.
- Prevented Enter in image/link/embed/table dialog inputs from implicitly
  submitting the containing admin form; verified image upload by keyboard in
  Django admin without navigating away or saving the article.
- Added a bilingual demo homepage with combined sanitized article listings,
  actual global/app configuration snippets, and localized explanations.
- Verified English/Turkish demo views, app article detail, and Turkish admin
  editor in a live browser.
- The demo now persists its generated development secret to the ignored
  `demo/.secret_key` file; production mode requires `DJANGO_SECRET_KEY`.
- Added regression checks for stable development keys, empty key files, and
  production startup without an explicit key.
- The final source distribution includes both localized demo catalogs,
  templates, and static assets; Twine metadata checks and archive-content
  verification both pass.
- Replaced the demo's per-process random development key with a stable
  gitignored local key file and made an explicit environment key mandatory in
  production.
- Added settings regression tests for reload stability and production-key
  requirements.
- Scoped neutral article typography to the editor surface, increased its
  width to fill its form field, and added accessible foreground/highlight color
  palettes backed by the server's CSS allowlist.
- Added PyPI project links for documentation, issues, and the changelog.
- Added a version-tag-triggered GitHub Actions release workflow that validates
  the tag against `pyproject.toml`, tests and builds distributions, then uses
  PyPI Trusted Publishing without a stored API token.

## Known boundaries

- Django-managed ORM and form write paths are validated; raw SQL and direct
  database writes cannot be intercepted by the package.
- Image processing will be an optional Pillow extra. Video uploads are not
  supported; only configured video embeds will be accepted.
