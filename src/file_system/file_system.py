from os import listdir, mkdir, remove, rename, rmdir, stat

try:
    # Type-checking only; see the note in hardware.py.
    from typing import Callable
except ImportError:
    pass

# st_mode bit that marks a directory. MicroPython has no `stat` module, and
# `os.stat()[0]` is the one field whose meaning is identical on both runtimes.
DIRECTORY_MODE_FLAG = 0x4000


class FileSystem:
    """Thin wrapper over the filesystem calls the API needs.

    `stat_fn` is injected so tests can substitute a fake, matching the
    pattern used by `Hardware`. The mutating operations below are not injected:
    they are only exercised against a real temporary directory, where the real
    semantics -- a rename over an existing name, a non-empty directory refusing
    to be removed -- are the whole point of the test.
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

    def is_directory(self, path: str) -> bool:
        try:
            return bool(stat(path)[0] & DIRECTORY_MODE_FLAG)
        except OSError:
            return False

    def make_directory(self, path: str) -> None:
        """Create `path`, tolerating one that is already there.

        MicroPython has no `exist_ok`, and checking first would still race
        against nothing in particular -- so the error is simply the answer.
        """
        try:
            mkdir(path)
        except OSError:
            if not self.is_directory(path):
                raise

    def write_file(self, path: str, data: bytes) -> None:
        with open(path, "wb") as handle:
            handle.write(data)

    def remove_tree(self, path: str) -> None:
        """Delete `path` and everything under it. A missing path is a no-op."""
        if not self.is_directory(path):
            try:
                remove(path)
            except OSError:
                pass
            return

        for entry in listdir(path):
            self.remove_tree(f"{path}/{entry}")

        rmdir(path)

    def replace_tree(self, source: str, target: str) -> None:
        """Swap `source` into `target`, then drop what `target` used to be.

        Deliberately not a delete-then-rename: the old tree stays in place until
        the new one is ready, so a failure part-way through leaves the device
        serving the previous web UI rather than nothing at all.
        """
        previous = f"{target}.previous"
        self.remove_tree(previous)

        if self.is_directory(target):
            rename(target, previous)

        rename(source, target)
        self.remove_tree(previous)
