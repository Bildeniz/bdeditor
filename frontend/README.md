# Frontend assets

The editor uses Tiptap and ProseMirror packages under their MIT licenses. Keep
the lockfile committed, retain notices in the generated distribution, and
review all dependency licenses before upgrading.

Build the static bundle from the repository root with:

```shell
npm --prefix frontend ci
python scripts/generate_third_party_notices.py
npm --prefix frontend run build
```

The build writes a local bundle to
`bd_editor/static/bd_editor/editor.js`. Installed projects do not need Node.js.
The browser bundle only implements the editing interface; server-side
sanitization remains authoritative.
