from os import stat

try:
    # Type-checking only; see the note in hardware.py.
    from typing import Callable
except ImportError:
    pass


class FileSystem:
    """Thin wrapper over the filesystem calls the API needs.

    `stat_fn` is injected so tests can substitute a fake, matching the
    pattern used by `Hardware`.
    """

    # The result is never inspected -- only whether the call raises -- so the
    # return type stays open rather than committing to a tuple shape that
    # differs between MicroPython and CPython.
    def __init__(self, stat_fn: "Callable[[str], object]" = stat) -> None:
        self._stat = stat_fn

    def file_exists(self, path: str) -> bool:
        try:
            self._stat(path)
        except OSError:
            return False

        return True

    def get_extension(self, path: str) -> str:
        dot = path.rfind(".")

        if dot == -1:
            return ""

        return path[dot:]
