# littlefs-python types its `open()` as returning IO[Unknown], so every handle
# taken from it degrades. That is a property of that dependency, not of this
# module -- the rest of strict mode stays on.
# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false
"""Build the LittleFS image that carries the web UI into a flash image.

A firmware image freezes `src/` but not the interface, so a device flashed from
firmware alone comes up with no `/www`. This produces the filesystem half, which
`esptool merge-bin` then places at the `vfs` partition offset so one file flashes
a complete device.

The geometry is not guessed. It was read off an ESP32-C6 running this firmware:

    >>> os.statvfs('/')
    (4096, 4096, 512, 509, 509, 0, 0, 0, 0, 255)
     bsize frsize blocks ...                    name_max

and the partition it has to fill:

    >>> [p.info() for p in Partition.find(Partition.TYPE_DATA)]
    ... (1, 129, 2097152, 2097152, 'vfs', False)
        subtype   offset   size

4096 x 512 is exactly those 2 MiB. Pass --block-count for a board whose `vfs`
partition is a different size; `esp32.Partition.find` on the device is the
authority, not this default.

Usage:
    python tools/build_littlefs_image.py web-ui/dist dist/littlefs.bin
"""

import pathlib
import sys

from littlefs import LittleFS
from littlefs.errors import LittleFSError

# MicroPython's VfsLfs2 defaults, confirmed against a device above.
BLOCK_SIZE = 4096
BLOCK_COUNT = 512
NAME_MAX = 255

# Where the files land on the device. The API serves from /www; anything else
# in the image would be dead weight in a flash budget measured in kilobytes.
TARGET_DIRECTORY = "www"

# littlefs's "no space left"; the one failure this tool can explain better than
# the library does.
LFS_ERR_NOSPC = -28


def build(root: pathlib.Path, block_count: int) -> bytes:
    filesystem = LittleFS(block_size=BLOCK_SIZE, block_count=block_count, name_max=NAME_MAX)

    try:
        filesystem.makedirs(f"/{TARGET_DIRECTORY}", exist_ok=True)

        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue

            relative = path.relative_to(root)
            parent = relative.parent.as_posix()

            if parent != ".":
                filesystem.makedirs(f"/{TARGET_DIRECTORY}/{parent}", exist_ok=True)

            with filesystem.open(f"/{TARGET_DIRECTORY}/{relative.as_posix()}", "wb") as handle:
                handle.write(path.read_bytes())
    except LittleFSError as error:
        if error.code != LFS_ERR_NOSPC:
            raise

        # Raw, this surfaces as "LFS_ERR_NOSPC" in a CI log, which says nothing
        # about which budget was blown. Running out can happen while creating a
        # directory, not only while writing a file, so the whole build is
        # wrapped rather than the write alone.
        capacity = BLOCK_SIZE * block_count
        raise SystemExit(f"the web UI no longer fits the {capacity} byte vfs partition") from error

    return bytes(filesystem.context.buffer)


def verify(image: bytes, root: pathlib.Path, block_count: int) -> None:
    """Mount the image back and compare it with what went in.

    Cheap, and it catches the failure that would otherwise only show up on a
    device that has already been flashed -- at which point the interface is gone
    and the filesystem has been reformatted underneath it.
    """
    filesystem = LittleFS(
        block_size=BLOCK_SIZE, block_count=block_count, name_max=NAME_MAX, mount=False
    )
    filesystem.context.buffer = bytearray(image)
    filesystem.mount()

    expected = {path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file()}

    for name in expected:
        with filesystem.open(f"/{TARGET_DIRECTORY}/{name}", "rb") as handle:
            if handle.read() != (root / name).read_bytes():
                raise SystemExit(f"{name}: content differs after a round trip")

    print(f"verified {len(expected)} files by mounting the image back")


def main() -> None:
    expected_arguments = 3

    if len(sys.argv) < expected_arguments:
        raise SystemExit(__doc__)

    root = pathlib.Path(sys.argv[1])
    output = pathlib.Path(sys.argv[2])
    block_count = int(sys.argv[3]) if len(sys.argv) > expected_arguments else BLOCK_COUNT

    image = build(root, block_count)
    verify(image, root, block_count)

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(image)

    print(f"{output}: {len(image)} bytes ({block_count} x {BLOCK_SIZE})")


if __name__ == "__main__":
    main()
