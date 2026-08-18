import pathlib

import pytest

from set_project_version import rewrite

# The shape that matters: a version inside [project], comments and tool
# sections around it, and a decoy `version` key in another table.
PYPROJECT = """[project]
name = "tank-buddy"
version = "0.1.0"
requires-python = ">=3.12"

# This comment has to survive; tomllib cannot write and a round trip through
# any writer would drop it along with every other comment in the file.
[tool.ruff]
target-version = "py38"

[tool.something]
version = "leave me alone"
"""


def test_the_project_version_is_replaced() -> None:
    result = rewrite(PYPROJECT, "0.2.0")

    assert 'version = "0.2.0"' in result
    assert 'version = "0.1.0"' not in result


def test_a_version_in_another_table_is_untouched() -> None:
    # `[project]` is the only version semantic-release owns. Rewriting the
    # first match anywhere would corrupt tool configuration instead.
    result = rewrite(PYPROJECT, "0.2.0")

    assert 'version = "leave me alone"' in result


def test_everything_else_is_byte_identical() -> None:
    # The file is mostly ruff and pyright configuration carrying the reasoning
    # behind it. Losing those comments to a release commit would be worse than
    # a stale version number.
    result = rewrite(PYPROJECT, "0.2.0")

    assert result.replace('version = "0.2.0"', 'version = "0.1.0"') == PYPROJECT


def test_a_missing_project_version_is_an_error() -> None:
    # Failing the release beats pushing a commit that changed nothing.
    with pytest.raises(SystemExit):
        rewrite('[project]\nname = "tank-buddy"\n', "0.2.0")


def test_the_version_must_be_inside_the_project_table() -> None:
    with pytest.raises(SystemExit):
        rewrite('[tool.other]\nversion = "0.1.0"\n', "0.2.0")


def test_it_writes_the_file_it_was_given(tmp_path: pathlib.Path) -> None:
    target = tmp_path / "pyproject.toml"
    target.write_text(PYPROJECT)

    rewritten = rewrite(target.read_text(), "0.3.0")
    target.write_text(rewritten)

    assert 'version = "0.3.0"' in target.read_text()
