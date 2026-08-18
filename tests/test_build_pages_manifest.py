import json
import pathlib

import pytest

from build_pages_manifest import IMAGE_DIRECTORY, collect, manifest

# What the release job drops into the firmware directory: one whole-chip image
# per board, alongside the firmware-only image that must never reach the
# installer.
RELEASE_ASSETS = (
    "tank-buddy-TANKBUDDY_ESP32-full.bin",
    "tank-buddy-TANKBUDDY_S2-full.bin",
    "tank-buddy-TANKBUDDY_S3-full.bin",
    "tank-buddy-TANKBUDDY_C3-full.bin",
    "tank-buddy-TANKBUDDY_C6-full.bin",
    "tank-buddy-TANKBUDDY_C6.bin",
)


@pytest.fixture
def firmware(tmp_path: pathlib.Path) -> pathlib.Path:
    for name in RELEASE_ASSETS:
        (tmp_path / name).write_bytes(b"\xe9image")

    return tmp_path


def test_every_board_becomes_a_build(firmware: pathlib.Path) -> None:
    families = {entry["chipFamily"] for entry in collect(firmware)}

    assert families == {"ESP32", "ESP32-S2", "ESP32-S3", "ESP32-C3", "ESP32-C6"}


def test_paths_stay_relative_to_the_manifest(firmware: pathlib.Path) -> None:
    # The regression this whole file exists for. Pointing a part at a GitHub
    # release URL passes every build and fails in the browser: neither
    # github.com nor its redirect target sends Access-Control-Allow-Origin, so
    # the fetch is blocked by CORS after the user has already plugged the board
    # in. Only a same-origin path can be fetched at all.
    for entry in collect(firmware):
        path = entry["parts"][0]["path"]

        assert not path.startswith(("http://", "https://", "//"))
        assert path.startswith(f"{IMAGE_DIRECTORY}/")


def test_the_firmware_only_image_is_not_offered(firmware: pathlib.Path) -> None:
    # It carries no filesystem, so flashing it onto a blank chip yields a device
    # that boots and serves nothing.
    paths = [entry["parts"][0]["path"] for entry in collect(firmware)]

    assert f"{IMAGE_DIRECTORY}/tank-buddy-TANKBUDDY_C6.bin" not in paths


def test_every_image_is_written_from_the_start_of_the_chip(
    firmware: pathlib.Path,
) -> None:
    for entry in collect(firmware):
        assert entry["parts"] == [{"path": entry["parts"][0]["path"], "offset": 0}]


def test_an_unknown_board_is_an_error(firmware: pathlib.Path) -> None:
    # Silently skipping it would publish an installer that is missing a board
    # nobody notices until someone with that board tries to use it.
    (firmware / "tank-buddy-TANKBUDDY_H2-full.bin").write_bytes(b"\xe9image")

    with pytest.raises(SystemExit):
        collect(firmware)


def test_no_images_at_all_is_an_error(tmp_path: pathlib.Path) -> None:
    # A Connect button that cannot reach an image is worse than no button.
    with pytest.raises(SystemExit):
        collect(tmp_path)


def test_the_manifest_erases_before_a_first_install(firmware: pathlib.Path) -> None:
    # The images already contain a fresh filesystem; a stale one left behind
    # would shadow it.
    document = manifest(collect(firmware), "v1.2.3")

    assert document["new_install_prompt_erase"] is True
    assert document["version"] == "v1.2.3"


def test_the_manifest_is_ordered_and_serialisable(firmware: pathlib.Path) -> None:
    # Deployed on every release; a stable order keeps the diff readable.
    document = manifest(collect(firmware), "v1.2.3")
    families = [entry["chipFamily"] for entry in collect(firmware)]

    assert families == sorted(families)
    assert json.loads(json.dumps(document)) == document
