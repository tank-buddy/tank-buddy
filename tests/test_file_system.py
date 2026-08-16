import pathlib

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


def test_is_directory_distinguishes_the_two(tmp_path: pathlib.Path) -> None:
    (tmp_path / "file").write_text("x")

    file_system = FileSystem()

    assert file_system.is_directory(str(tmp_path)) is True
    assert file_system.is_directory(str(tmp_path / "file")) is False
    assert file_system.is_directory(str(tmp_path / "missing")) is False


def test_make_directory_tolerates_an_existing_one(tmp_path: pathlib.Path) -> None:
    target = str(tmp_path / "www")
    file_system = FileSystem()

    file_system.make_directory(target)
    file_system.make_directory(target)

    assert file_system.is_directory(target) is True


def test_make_directory_still_raises_on_a_real_failure(tmp_path: pathlib.Path) -> None:
    # A file where the directory should go is not "already there".
    blocked = tmp_path / "www"
    blocked.write_text("x")

    with pytest.raises(OSError):
        FileSystem().make_directory(str(blocked))


def test_remove_tree_deletes_nested_content(tmp_path: pathlib.Path) -> None:
    root = tmp_path / "www"
    (root / "assets").mkdir(parents=True)
    (root / "index.html.gz").write_bytes(b"a")
    (root / "assets" / "app.js.gz").write_bytes(b"b")

    FileSystem().remove_tree(str(root))

    assert not root.exists()


def test_remove_tree_of_a_missing_path_is_a_no_op() -> None:
    FileSystem().remove_tree("/definitely/not/here")


def test_replace_tree_swaps_and_drops_the_old_one(tmp_path: pathlib.Path) -> None:
    target = tmp_path / "www"
    target.mkdir()
    (target / "old.gz").write_bytes(b"old")

    source = tmp_path / "www-new"
    source.mkdir()
    (source / "new.gz").write_bytes(b"new")

    FileSystem().replace_tree(str(source), str(target))

    assert (target / "new.gz").read_bytes() == b"new"
    assert not (target / "old.gz").exists()
    assert not source.exists()
    # The staging copy must not survive as a second tree eating flash.
    assert not (tmp_path / "www.previous").exists()


def test_replace_tree_works_when_there_is_nothing_to_replace(
    tmp_path: pathlib.Path,
) -> None:
    source = tmp_path / "www-new"
    source.mkdir()
    (source / "index.html.gz").write_bytes(b"new")

    FileSystem().replace_tree(str(source), str(tmp_path / "www"))

    assert (tmp_path / "www" / "index.html.gz").read_bytes() == b"new"


def test_write_file_round_trips_bytes(tmp_path: pathlib.Path) -> None:
    path = str(tmp_path / "index.html.gz")

    FileSystem().write_file(path, b"\x1f\x8b payload")

    assert pathlib.Path(path).read_bytes() == b"\x1f\x8b payload"
