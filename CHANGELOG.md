# Changelog

Notable changes to BD-Editor are documented here. Releases follow
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- Left/center/right text alignment and image editing controls for display size,
  placement, and text wrapping.
- Global and per-app settings for alignment controls, image dimensions,
  aspect-ratio defaults, and allowed image layouts.
- Contextual image-flow and inline-alignment controls in the toolbar, with a
  configurable maximum width for text-wrapping float layouts.
- Blue resize handles with bounded resizing and a live image dimension/ratio
  readout; inline image vertical alignment now defaults to the top.

### Fixed

- Aligned all resize handles with their image edges and clarified inline
  alignment versus paragraph wrapping in the image dialog.
- Prevented oversized float images from consuming the full text column when
  authors choose side-by-side paragraph wrapping.

## [0.1.1] - 2026-11-15

### Added

- Configurable minimum and maximum JPEG/WebP quality, with local estimates of
  possible output sizes in the image dialog.
- An opt-in, non-blocking reminder for images without alternative text.
- Cell and row background colors, clearing, and customizable two-color zebra
  striping for tables.

## [0.1.0] - 2026-11-14

### Added

- Initial PyPI release of the configurable Django rich-text editor.
- Server-side HTML sanitization, Django model/form integration, optional image
  processing, and provider-allowlisted video embeds.
- Global and per-app settings, toolbar presets, editable tables, image and link
  dialogs, and optional browser-local drafts.
- English and Turkish editor localization and a two-app demo project.
- Package build metadata, documentation, and security guidance.

