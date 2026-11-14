import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
NODE_MODULES = FRONTEND / "node_modules"
LOCKFILE = FRONTEND / "package-lock.json"
OUTPUT = ROOT / "bd_editor" / "static" / "bd_editor" / "THIRD_PARTY_NOTICES.txt"

lockfile = json.loads(LOCKFILE.read_text(encoding="utf-8"))
sections = [
    "Third-party notices for BD-Editor's bundled editor JavaScript.",
    "Only production dependencies present in the bundled asset are listed.",
]

for relative_path, metadata in sorted(lockfile["packages"].items()):
    if not relative_path.startswith("node_modules/") or metadata.get("dev", False):
        continue

    package_dir = FRONTEND / relative_path
    package_data = json.loads((package_dir / "package.json").read_text(encoding="utf-8"))
    package_name = package_data["name"]
    package_version = package_data["version"]
    package_license = package_data.get("license")
    if package_license != "MIT":
        raise SystemExit(
            f"Review license for {package_name}@{package_version}: {package_license!r}"
        )

    license_files = sorted(
        path
        for path in package_dir.iterdir()
        if path.is_file()
        and path.name.upper().startswith(("LICENSE", "LICENCE", "COPYING", "NOTICE"))
    )
    if not license_files:
        raise SystemExit(f"No license notice found for {package_name}@{package_version}.")

    sections.append(
        f"\n{'=' * 78}\n{package_name}@{package_version} ({package_license})\n"
        f"{'=' * 78}\n{license_files[0].read_text(encoding='utf-8').strip()}"
    )

OUTPUT.write_text("\n".join(sections) + "\n", encoding="utf-8")
print(f"Wrote {OUTPUT.relative_to(ROOT)} with {len(sections) - 2} package notices.")
