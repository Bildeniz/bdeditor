# BD-Editor progress

## Current status

- Milestone 1: complete.
- Milestone 2: complete.
- Milestone 3: complete.
- Milestone 4: complete.
- Milestone 5: complete.
- Milestone 6: complete.

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
- The 20-test suite passes on Python 3.14 with Django 5.2.19, 6.0.10, and
  6.1.3. CI is configured for the supported Python/Django combinations.

## Known boundaries

- Django-managed ORM and form write paths will be validated; raw SQL and direct
  database writes cannot be intercepted by the package.
- Image processing will be an optional Pillow extra. Video uploads are not
  supported; only configured video embeds will be accepted.
