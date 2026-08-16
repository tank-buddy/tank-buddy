import pathlib

import pytest
from littlefs import LittleFS

from build_littlefs_image import BLOCK_SIZE, TARGET_DIRECTORY, build, verify

# What `pnpm build` emits, minus the content.
BUILD_OUTPUT = {
    "index.html.gz": b"\x1f\x8b html",
    "manifest.webmanifest.gz": b"\x1f\x8b manifest",
    "apple-touch-icon.png": b"\x89PNG\r\n\x1a\n",
    "assets/index-abc123.js.gz": b"\x1f\x8b js",
    "assets/index-abc123.css.gz": b"\x1f\x8b css",
}

# The geometry read off an ESP32-C6 running this firmware. A smaller count keeps
# the tests fast; the real image uses 512.
TEST_BLOCK_COUNT = 64


@pytest.fixture
def web_ui(tmp_path: pathlib.Path) -> pathlib.Path:
    for name, content in BUILD_OUTPUT.items():
        path = tmp_path / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    return tmp_path


def test_image_fills_the_partition_exactly(web_ui: pathlib.Path) -> None:
    # esptool writes the image at the vfs offset, so a short one would leave the
    # tail of the partition holding whatever was there before.
    image = build(web_ui, TEST_BLOCK_COUNT)

    assert len(image) == BLOCK_SIZE * TEST_BLOCK_COUNT


def test_every_file_survives_a_mount(web_ui: pathlib.Path) -> None:
    image = build(web_ui, TEST_BLOCK_COUNT)

    filesystem = LittleFS(
        block_size=BLOCK_SIZE, block_count=TEST_BLOCK_COUNT, name_max=255, mount=False
    )
    filesystem.context.buffer = bytearray(image)
    filesystem.mount()

    for name, content in BUILD_OUTPUT.items():
        with filesystem.open(f"/{TARGET_DIRECTORY}/{name}", "rb") as handle:
            assert handle.read() == content


def test_nothing_lands_outside_the_web_ui_directory(web_ui: pathlib.Path) -> None:
    # The image replaces the whole partition, so anything else in it would also
    # replace -- or shadow -- what the device keeps there, /settings.json first
    # among them.
    image = build(web_ui, TEST_BLOCK_COUNT)

    filesystem = LittleFS(
        block_size=BLOCK_SIZE, block_count=TEST_BLOCK_COUNT, name_max=255, mount=False
    )
    filesystem.context.buffer = bytearray(image)
    filesystem.mount()

    assert [entry.name for entry in filesystem.scandir("/")] == [TARGET_DIRECTORY]


def test_verify_accepts_a_matching_image(web_ui: pathlib.Path) -> None:
    verify(build(web_ui, TEST_BLOCK_COUNT), web_ui, TEST_BLOCK_COUNT)


def test_verify_rejects_content_that_drifted(web_ui: pathlib.Path) -> None:
    # The check exists so a broken image fails the build rather than the device,
    # where the interface is already gone by the time anyone notices.
    image = build(web_ui, TEST_BLOCK_COUNT)
    (web_ui / "index.html.gz").write_bytes(b"something else entirely")

    with pytest.raises(SystemExit):
        verify(image, web_ui, TEST_BLOCK_COUNT)


def test_a_web_ui_too_large_for_the_partition_fails(web_ui: pathlib.Path) -> None:
    # Raw, littlefs reports LFS_ERR_NOSPC, which in a CI log says nothing about
    # which budget was blown.
    (web_ui / "huge.gz").write_bytes(b"x" * (BLOCK_SIZE * 8))

    with pytest.raises(SystemExit, match="no longer fits"):
        build(web_ui, 4)
