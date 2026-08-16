"""Erase the device filesystem before a fresh upload.

Runs ON the device via `mpremote run`. Without this, modules deleted from the
source tree (config/, schema/, certs.py) would linger in flash and still be
importable, so the device would not match the build.

`/settings.json` is preserved: since the web UI can change settings at runtime,
the device is the source of truth for them. Use `make provision` to overwrite
it from the local file on purpose.
"""

import os

KEEP = ("settings.json",)

_DIRECTORY_FLAG = 0x4000


def is_directory(path: str) -> bool:
    return os.stat(path)[0] & _DIRECTORY_FLAG != 0


def remove(path: str) -> None:
    if is_directory(path):
        for entry in os.listdir(path):
            remove(path + "/" + entry)
        os.rmdir(path)
        return

    os.remove(path)


for entry in os.listdir("/"):
    if entry in KEEP:
        print("keeping  /" + entry)
        continue

    remove("/" + entry)
    print("removed  /" + entry)
