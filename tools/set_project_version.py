"""Write the released version into `[project]` of pyproject.toml.

Called by semantic-release, which owns the version number. The value is
decorative -- `[tool.uv] package = false`, so nothing builds or publishes this
project -- but a file that permanently claims 0.1.0 while the tags have moved on
misleads the next person to read it.

Line-based on purpose. `tomllib` cannot write, and every writer that could would
drop the comments; most of pyproject.toml is ruff and pyright configuration with
the reasoning for each setting written next to it.

Usage:
    python tools/set_project_version.py pyproject.toml 1.2.3
"""

import pathlib
import re
import sys

PROJECT_TABLE = "[project]"
VERSION_PATTERN = re.compile(r'^version\s*=\s*".*"$')
TABLE_PATTERN = re.compile(r"^\[")


def rewrite(content: str, version: str) -> str:
    lines = content.splitlines(keepends=True)
    in_project = False

    for index, line in enumerate(lines):
        stripped = line.strip()

        if TABLE_PATTERN.match(stripped):
            # Leaving [project] without having found the key is a failure, not
            # a licence to rewrite a version in some tool's table.
            if in_project:
                break

            in_project = stripped == PROJECT_TABLE
            continue

        if in_project and VERSION_PATTERN.match(stripped):
            lines[index] = f'version = "{version}"\n'

            return "".join(lines)

    raise SystemExit(f"no version key in {PROJECT_TABLE} -- did pyproject.toml change?")


def main() -> None:
    expected_arguments = 3

    if len(sys.argv) != expected_arguments:
        raise SystemExit(__doc__)

    target = pathlib.Path(sys.argv[1])
    version = sys.argv[2]

    target.write_text(rewrite(target.read_text(), version))

    print(f"{target}: version = {version}")


if __name__ == "__main__":
    main()
