from pathlib import Path

try:
    import polib
except ImportError as error:
    raise SystemExit("Install the BD-Editor i18n extra before compiling catalogs.") from error


ROOT = Path(__file__).resolve().parents[1]
CATALOG_DIRECTORIES = [
    ROOT / "bd_editor" / "locale",
    ROOT / "demo" / "locale",
]

for catalog_directory in CATALOG_DIRECTORIES:
    for po_path in catalog_directory.glob("*/LC_MESSAGES/django.po"):
        mo_path = po_path.with_suffix(".mo")
        polib.pofile(str(po_path)).save_as_mofile(str(mo_path))
        print(f"Compiled {po_path.relative_to(ROOT)} -> {mo_path.relative_to(ROOT)}")
