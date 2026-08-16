"""Pack the built web UI into the single file the update panel downloads.

One JSON document with base64 contents rather than a tar or a zip: either
archive would need unpacking code in the browser bundle, and every byte of that
bundle is flashed onto the device. Base64 costs a third more over the wire,
which is paid once per update by a browser that is already on the internet.

Usage:
    python tools/build_web_ui_bundle.py web-ui/dist v1.2.3 dist/web-ui.json
"""

import base64
import json
import pathlib
import sys

# Mirrors ALLOWED_ASSET_EXTENSIONS and ASSET_SUBDIRECTORY in src/api/api.py.
# A file the device would refuse is worse in the bundle than missing from it:
# the update would fail half way rather than not start.
ALLOWED_EXTENSIONS = (".gz", ".png")
ALLOWED_SUBDIRECTORY = "assets"


def collect(root: pathlib.Path) -> "dict[str, str]":
    files: "dict[str, str]" = {}

    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue

        relative = path.relative_to(root)

        if path.suffix not in ALLOWED_EXTENSIONS:
            raise SystemExit(f"{relative}: the device only accepts {ALLOWED_EXTENSIONS}")

        if len(relative.parts) > 1 and relative.parts[0] != ALLOWED_SUBDIRECTORY:
            raise SystemExit(f"{relative}: only {ALLOWED_SUBDIRECTORY}/ may be nested")

        if len(relative.parts) > 2:  # noqa: PLR2004 - one optional directory level
            raise SystemExit(f"{relative}: nested too deeply for the device")

        files[relative.as_posix()] = base64.b64encode(path.read_bytes()).decode("ascii")

    if not files:
        raise SystemExit(f"{root}: nothing to bundle -- was the web UI built?")

    return files


def main() -> None:
    expected_arguments = 4

    if len(sys.argv) != expected_arguments:
        raise SystemExit(__doc__)

    root = pathlib.Path(sys.argv[1])
    version = sys.argv[2]
    output = pathlib.Path(sys.argv[3])

    files = collect(root)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"version": version, "files": files}))

    raw = sum(len(value) for value in files.values())
    print(f"{output}: {len(files)} files, {raw} bytes encoded")


if __name__ == "__main__":
    main()
