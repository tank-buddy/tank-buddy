import pytest

from file_system import FileSystem


def test_file_exists_when_stat_succeeds() -> None:
    file_system = FileSystem(stat_fn=lambda _: (0,))

    assert file_system.file_exists("/www/index.html.gz") is True


def test_file_exists_when_stat_raises() -> None:
    def missing(_path: str) -> object:
        raise OSError("No such file")

    file_system = FileSystem(stat_fn=missing)

    assert file_system.file_exists("/www/nope.gz") is False


@pytest.mark.parametrize(
    ("path", "expected"),
    [
        ("index.html", ".html"),
        ("/www/assets/index-abc123.js", ".js"),
        ("archive.tar.gz", ".gz"),
        ("noextension", ""),
        ("", ""),
    ],
)
def test_get_extension(path: str, expected: str) -> None:
    assert FileSystem().get_extension(path) == expected
