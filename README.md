# BD-Editor

BD-Editor is a configurable rich-text editor for Django admin and forms. It
provides a bundled editor UI, server-side HTML sanitization, per-app toolbar
settings, optional image conversion, and allowlisted video embeds.

The PyPI distribution is named `bd-editor`; import it as `bd_editor`.

## Install

```shell
pip install bd-editor
```

For image upload and conversion support:

```shell
pip install "bd-editor[images]"
```

## Quick start

1. Add `bd_editor` to `INSTALLED_APPS`.
2. Add `path("bd-editor/", include("bd_editor.urls"))` to the root URLconf.
3. Use `bd_editor.fields.RichTextField` on a model. Django admin and
   `ModelForm` will use the bundled editor widget automatically.
4. Configure global and app-specific editor behavior in `BD_EDITOR`.

See [the documentation](docs/en/quickstart.md) for a runnable example,
configuration reference, localization, and security model. A two-app example
project is in [demo/](demo/).

## Security boundary

The editing interface uses JavaScript, but submitted content is sanitized on
the server and does not permit executable scripts, inline event handlers,
unsafe URL schemes, or arbitrary iframes. Script-like examples entered in code
blocks are escaped text. Images are validated from their decoded content;
video uploads are rejected. Image uploads require CSRF protection and a staff
user with add/change permission for the associated model.

No Django library can intercept direct SQL or writes made outside Django's
validated ORM paths. Applications must still render through BD-Editor's
sanitizing template integration and must not mark untrusted values safe
themselves. See [the security guide](docs/en/security.md).

## Development status

The project is under active development. See [Progress.md](Progress.md) for
milestones and [Agents.md](Agents.md) for development and security invariants.

## License

BD-Editor is released under the MIT license. Bundled third-party components
retain their own copyright and license notices.
