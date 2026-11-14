# BD-Editor demo project

This project contains two independent Django apps with different editor
toolbar settings:

- `blog_a`: heading controls are enabled and underline is disabled.
- `blog_b`: heading controls are disabled and underline is enabled.

From the repository root, install the package and its optional image support:

```shell
pip install -e ".[images]"
cd demo
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open `http://127.0.0.1:8000/admin/`, sign in, and create an article in either
app. The upload view is mounted under `/bd-editor/` and is limited to active
Django staff users. The demo uses SQLite and local media storage and is for
development only. It is not a production deployment template.

With `DJANGO_DEBUG=1` (the default), the demo generates a stable,
development-only key in the ignored `demo/.secret_key` file so authenticated
sessions survive `runserver` auto-reloads. For production, set a private
`DJANGO_SECRET_KEY` and `DJANGO_DEBUG=0`; the settings refuse to start in
production mode without an explicit key.

Existing sessions signed with an earlier, randomly regenerated key may require
one sign-in after this change. Keep `demo/.secret_key` between local runs;
removing it invalidates current demo sessions.

Open `http://127.0.0.1:8000/` to see the articles from both apps together and
review the running `BD_EDITOR` settings. Use the language selector to switch
the demo page and editor between English and Turkish. Configuration snippets
show the actual global and per-app settings from `demo_project/settings.py`.
For Turkish setup notes, see [README.tr.md](README.tr.md).
