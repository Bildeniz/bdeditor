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
