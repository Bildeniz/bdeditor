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
- Trusted PyPI publishing workflow and linked release changelog: complete.
  Trusted Publisher is configured; BD-Editor 0.1.1 was published on PyPI on
  2026-11-16.
- Milestone 7: complete — configurable image quality bounds, local output-size
  estimates, and the optional non-blocking image alt-text warning.
- Milestone 8: complete — editable table cell/row colors and custom zebra
  striping.
- Release 0.1.1: published. `pyproject.toml` reports version `0.1.1`; the full
  test suite and distribution checks passed before publication.
- Milestone 9: complete — text alignment, image resizing, and block/inline/
  text-wrapping image layouts with global and per-app configuration.
- Milestone 10: complete — top-aligned inline text, working float wrapping,
  bounded blue resize handles, and live dimension/aspect-ratio feedback.
- Milestone 11: complete — resize handles meet the image edges, inline text
  alignment is adjustable and explained, and float layouts are identified as
  the multi-line text-wrapping option.
- Milestone 12: complete — float layouts reserve a configurable text column,
  and selected-image flow/alignment controls are available directly in the
  toolbar.

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
- Added configurable JPEG/WebP quality bounds, local browser estimates for
  output sizes, and an opt-in non-blocking reminder for missing image alt text.
- Added editable table cell/row colors, clear controls, and user-selected
  two-color zebra striping; browser smoke checks cover all three operations.
- The 41-test suite, Django demo checks, frontend syntax/build, targeted Ruff
  checks, wheel/sdist build, Twine metadata checks, and required wheel-asset
  checks pass for 0.1.1.
- Added left/center/right block alignment, selected-image editing for size,
  alt/title, and layout, plus inline and left/right text-wrapping modes.
- Added global/per-app image display limits and layout choices; image widths
  and heights are bounded again by server-side sanitization.
- Browser smoke checks cover alignment/reset, image editing and upload,
  aspect-ratio lock/unlock, configured size caps, and block/inline/float
  layouts. The 48-test suite, demo checks, frontend build, targeted Ruff,
  wheel/sdist build, Twine checks, and package-content checks pass.
- The live `/articles/blog_a/1/` demo article was inspected; a temporary
  right-float/180px preview placed the first text line at the image top and
  wrapped it beside the image without changing the saved article. Headless
  Chrome verified all resize handles, configured limits, ratio feedback, float
  wrapping, and inline top alignment.
- The 50-test suite, demo checks, frontend syntax/build, changed-file Ruff,
  wheel/sdist build, Twine checks, and package-content checks pass after
  milestone 10.
- Headless Chrome measured zero-pixel offsets between all eight resize-handle
  centers and image edges. The image dialog moved inline text from a 74.5px
  middle offset to a 2px top offset; a 280×175px float kept seven text lines
  beside the image. English/Turkish help and configuration docs explain the
  distinct inline and float behaviors.
- Inspecting the actual admin article showed its 680px inline image in a 700px
  content area, leaving no room for the rest of the text. The toolbar now
  changes image flow and inline alignment directly; float layout caps image
  width at the configurable 50% default. Live Chrome checks at 700px content
  width confirmed a 350px image, top-aligned text, nine wrapped lines beside
  the image, and zero-pixel resize-handle offsets. After the user reported the
  published page still used inline layout, only the demo image placement was
  saved as float-left; its title, text, table, and other fields were unchanged.
- Corrected the existing `v0.1.1` tag to the release commit and published the
  wheel and source distribution to PyPI through the Trusted Publishing workflow.

## Validation note

- A full-repository Ruff run still reports four pre-existing formatting/import
  findings in the two demo initial migrations; all changed Python files pass
  Ruff.

## Known boundaries

- Django-managed ORM and form write paths are validated; raw SQL and direct
  database writes cannot be intercepted by the package.
- Image processing will be an optional Pillow extra. Video uploads are not
  supported; only configured video embeds will be accepted.
