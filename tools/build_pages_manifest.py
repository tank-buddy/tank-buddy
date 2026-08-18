"""Build the ESP Web Tools manifest served next to the browser installer.

The images are addressed by a path relative to this manifest, and that is the
whole point of the file. The installer used to assemble a manifest in the
browser from the GitHub release API and point each part at the asset's
`browser_download_url`, which cannot work: `github.com/.../releases/download/`
answers a cross-origin request with a 302 carrying no
`Access-Control-Allow-Origin`, and its redirect target
`release-assets.githubusercontent.com` sends no CORS headers either. A browser
therefore cannot fetch a GitHub release asset from another origin at all, by
any URL. So the images are published onto the Pages site itself and fetched
same-origin, which costs a Pages deploy per release and buys an installer that
works.

Usage:
    python tools/build_pages_manifest.py _site/firmware v1.2.3 _site/manifest.json
"""

import json
import pathlib
import sys
from typing import TypedDict

# The ESP Web Tools manifest schema, spelled out because it is a contract with
# someone else's code rather than a shape this project is free to choose.


class Part(TypedDict):
    path: str
    offset: int


class Build(TypedDict):
    # Upstream's spelling. This is the one place camelCase is correct here.
    chipFamily: str  # noqa: N815
    parts: "list[Part]"


class Manifest(TypedDict):
    name: str
    version: str
    new_install_prompt_erase: bool
    builds: "list[Build]"


# The boards built by .github/workflows/release.yml, mapped onto the chip names
# ESP Web Tools matches against what it reads over serial. Keep in step with the
# matrix there and with boards/.
CHIP_FAMILIES = {
    "TANKBUDDY_ESP32": "ESP32",
    "TANKBUDDY_S2": "ESP32-S2",
    "TANKBUDDY_S3": "ESP32-S3",
    "TANKBUDDY_C3": "ESP32-C3",
    "TANKBUDDY_C6": "ESP32-C6",
}

# Only the whole-chip images belong in the installer. The firmware-only image
# shares the prefix but carries no filesystem, so flashing it onto a blank chip
# produces a device that boots and serves nothing.
IMAGE_PREFIX = "tank-buddy-"
IMAGE_SUFFIX = "-full.bin"

# Where the deploy job puts the images, relative to the manifest.
IMAGE_DIRECTORY = "firmware"


def collect(root: pathlib.Path) -> "list[Build]":
    # Sorted by chip family rather than by filename: this file is redeployed on
    # every release, and a stable order keeps the diff readable.
    images: "list[tuple[str, str]]" = []

    for path in sorted(root.glob(f"{IMAGE_PREFIX}*{IMAGE_SUFFIX}")):
        board = path.name[len(IMAGE_PREFIX) : -len(IMAGE_SUFFIX)]
        chip_family = CHIP_FAMILIES.get(board)

        if chip_family is None:
            raise SystemExit(f"{path.name}: unknown board {board!r} -- add it to CHIP_FAMILIES")

        images.append((chip_family, path.name))

    if not images:
        raise SystemExit(f"{root}: no flashable images -- did the release finish?")

    images.sort()

    return [
        {
            "chipFamily": chip_family,
            "parts": [{"path": f"{IMAGE_DIRECTORY}/{name}", "offset": 0}],
        }
        for chip_family, name in images
    ]


def manifest(builds: "list[Build]", version: str) -> Manifest:
    return {
        "name": "TankBuddy",
        "version": version,
        # The images already contain a fresh filesystem, and a stale one left
        # behind would shadow it.
        "new_install_prompt_erase": True,
        "builds": builds,
    }


def main() -> None:
    expected_arguments = 4

    if len(sys.argv) != expected_arguments:
        raise SystemExit(__doc__)

    root = pathlib.Path(sys.argv[1])
    version = sys.argv[2]
    output = pathlib.Path(sys.argv[3])

    builds = collect(root)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest(builds, version), indent=2))

    print(f"{output}: {version}, {len(builds)} boards")


if __name__ == "__main__":
    main()
