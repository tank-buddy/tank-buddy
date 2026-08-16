import base64
import pathlib

import pytest

from build_web_ui_bundle import collect

# What `pnpm build` actually emits, minus the content.
BUILD_OUTPUT = {
    "index.html.gz": b"\x1f\x8b html",
    "manifest.webmanifest.gz": b"\x1f\x8b manifest",
    "apple-touch-icon.png": b"\x89PNG\r\n\x1a\n",
    "assets/index-abc123.js.gz": b"\x1f\x8b js",
}


@pytest.fixture
def build(tmp_path: pathlib.Path) -> pathlib.Path:
    for name, content in BUILD_OUTPUT.items():
        path = tmp_path / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    return tmp_path


def test_every_file_round_trips(build: pathlib.Path) -> None:
    files = collect(build)

    assert set(files) == set(BUILD_OUTPUT)
    for name, content in BUILD_OUTPUT.items():
        assert base64.b64decode(files[name]) == content


def test_rejects_what_the_device_would_refuse(build: pathlib.Path) -> None:
    # The device's is_safe_asset_path only accepts .gz and .png. Catching it
    # here fails the release; catching it there fails the update half way.
    (build / "sourcemap.js.map").write_bytes(b"{}")

    with pytest.raises(SystemExit):
        collect(build)


def test_rejects_an_unexpected_directory(build: pathlib.Path) -> None:
    nested = build / "vendor"
    nested.mkdir()
    (nested / "extra.gz").write_bytes(b"\x1f\x8b")

    with pytest.raises(SystemExit):
        collect(build)


def test_rejects_nesting_the_device_cannot_address(build: pathlib.Path) -> None:
    deep = build / "assets" / "chunks"
    deep.mkdir(parents=True)
    (deep / "part.gz").write_bytes(b"\x1f\x8b")

    with pytest.raises(SystemExit):
        collect(build)


def test_an_empty_build_is_an_error(tmp_path: pathlib.Path) -> None:
    # Bundling nothing would publish a release that erases the UI on install.
    with pytest.raises(SystemExit):
        collect(tmp_path)
