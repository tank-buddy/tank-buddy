"""Fetch the third-party code pinned in vendor.toml into src/external/.

Runs on the development machine, not the device.

`vendor` writes exactly the pinned refs, so the git diff after a pin bump is
the review. `check` only reports drift against upstream and changes nothing --
pulling unreviewed third-party code onto a device that is awkward to reflash is
not something a Makefile target should do behind your back.
"""

from __future__ import annotations

import json
import sys
import tomllib
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, NamedTuple

MANIFEST = Path(__file__).resolve().parent.parent / "vendor.toml"
ROOT = MANIFEST.parent

RAW_URL = "https://raw.githubusercontent.com/{repo}/{ref}/{path}"
TAGS_URL = "https://api.github.com/repos/{repo}/tags?per_page=1"
COMMITS_URL = "https://api.github.com/repos/{repo}/commits?per_page=1"

TIMEOUT_S = 30


class VendorError(RuntimeError):
    pass


def _fetch(url: str) -> bytes:
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_S) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        raise VendorError(f"{url} -> HTTP {error.code}") from error
    except urllib.error.URLError as error:
        raise VendorError(f"{url} -> {error.reason}") from error


class Rewrite(NamedTuple):
    """A required, documented edit to an upstream file."""

    search: str
    replace: str


class VendoredFile(NamedTuple):
    source: str
    destination: str
    rewrites: list[Rewrite]


class Dependency(NamedTuple):
    name: str
    repo: str
    ref: str
    files: list[VendoredFile]


def _load_manifest() -> list[Dependency]:
    """Parse vendor.toml into typed records.

    tomllib hands back `Any`; converting once here keeps the rest of the module
    type-checkable instead of spreading unknowns through every call site.
    """
    with MANIFEST.open("rb") as handle:
        raw: dict[str, Any] = tomllib.load(handle)

    dependencies: list[Dependency] = []
    for name, spec in raw.items():
        files = [
            VendoredFile(
                source=str(entry["from"]),
                destination=str(entry["to"]),
                rewrites=[
                    Rewrite(search=str(r["search"]), replace=str(r["replace"]))
                    for r in entry.get("rewrites", entry.get("rewrite", []))
                ],
            )
            for entry in spec["files"]
        ]
        dependencies.append(
            Dependency(name=name, repo=str(spec["repo"]), ref=str(spec["ref"]), files=files)
        )

    return dependencies


def _apply_rewrites(content: bytes, file: VendoredFile) -> bytes:
    """Apply the manifest's documented edits, failing if one no longer matches.

    A silently skipped rewrite would produce a file that imports the wrong
    module -- better to stop and make someone look at the upstream change.
    """
    if not file.rewrites:
        return content

    text = content.decode()
    for rewrite in file.rewrites:
        if rewrite.search not in text:
            raise VendorError(
                f"{file.destination}: rewrite target {rewrite.search!r} not found upstream; "
                "the manifest needs updating"
            )
        text = text.replace(rewrite.search, rewrite.replace)

    return text.encode()


def vendor() -> int:
    """Write every pinned file into the tree. Idempotent."""
    changed = 0

    for dependency in _load_manifest():
        print(f"{dependency.name} @ {dependency.ref}")

        for file in dependency.files:
            url = RAW_URL.format(repo=dependency.repo, ref=dependency.ref, path=file.source)
            target = ROOT / file.destination
            content = _apply_rewrites(_fetch(url), file)

            previous = target.read_bytes() if target.exists() else None
            if previous == content:
                print(f"  = {file.destination}")
                continue

            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            changed += 1
            marker = "~" if previous else "+"
            patched = " (rewritten)" if file.rewrites else ""
            print(f"  {marker} {file.destination}{patched}")

    print(f"\n{changed} file(s) changed. Review with `git diff`, then run `make check-all`.")
    return 0


def _upstream_state(dependency: Dependency) -> str:
    tags: Any = json.loads(_fetch(TAGS_URL.format(repo=dependency.repo)))

    if tags:
        latest = str(tags[0]["name"])
        if latest == dependency.ref:
            return "current"
        return f"UPDATE: {dependency.ref} -> {latest}"

    # No tags upstream; compare against the default branch head instead.
    head: Any = json.loads(_fetch(COMMITS_URL.format(repo=dependency.repo)))[0]
    sha = str(head["sha"])
    if sha == dependency.ref:
        return "current"

    date = str(head["commit"]["committer"]["date"])[:10]
    return f"UPDATE: pinned {dependency.ref[:12]} -> head {sha[:12]} ({date})"


def check() -> int:
    """Report where upstream has moved past a pin. Never writes."""
    outdated = 0

    for dependency in _load_manifest():
        state = _upstream_state(dependency)
        if state != "current":
            outdated += 1
        print(f"{dependency.name:<10} {state}")

    if outdated:
        print(f"\n{outdated} dependency(ies) behind upstream. Bump `ref` in vendor.toml.")

    # Advisory only: being behind is a decision to make, not a build failure.
    return 0


def main() -> int:
    commands = {"vendor": vendor, "check": check}
    command = sys.argv[1] if len(sys.argv) > 1 else "vendor"

    if command not in commands:
        print(f"usage: vendor.py [{' | '.join(commands)}]", file=sys.stderr)
        return 2

    try:
        return commands[command]()
    except VendorError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
