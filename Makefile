STUBS_FOR=esp32
STUBS_VERSION=1.28.*
STUBS_PATH=typings
MPY_CROSS=uv run mpy-cross-v6
MPREMOTE=uv run mpremote
BASE_PATH ?= $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
WEB_UI_DIRECTORY=web-ui
WEB_UI_PATH=$(BASE_PATH)/$(WEB_UI_DIRECTORY)

# Every target is a command, not a file. Without this, `clean`, `build` and
# `dist` would be shadowed by the dist/ directory they operate on.
.PHONY: clean build-web-ui build-core build \
        stubs lint format typecheck test check \
        web-ui-lint web-ui-test web-ui-check check-all \
        vendor vendor-check \
        upload provision run-on-device

clean:
	rm -Rf dist

build-web-ui:
	cd $(WEB_UI_PATH); pnpm install --frozen-lockfile; pnpm build

# settings.json is deliberately NOT bundled: the device owns its runtime
# settings (the web UI writes them), so a flash must not silently roll them
# back to whatever is on the build machine. `make provision` pushes it.
build-core:
	mkdir -p dist
	find src/ -name '*.py' | grep -vE 'src/(main|boot)\.py$$' | xargs -n1 $(MPY_CROSS) -O2
	cp -a src/. dist/
	find src/ -name '*.mpy' | xargs -n1 rm
	find dist/ -name '*.py' | grep -vE 'dist/(main|boot)\.py$$' | xargs -n1 rm
	# `cp -a` copies everything, including CPython bytecode left behind by
	# local pytest runs and macOS metadata. None of it belongs on the device.
	find dist -name '__pycache__' -type d -prune -exec rm -rf {} +
	find dist \( -name '.DS_Store' -o -name '*.pyc' \) -delete
	mkdir -p dist/www
	cp -a ./$(WEB_UI_DIRECTORY)/dist/. ./dist/www/

build: clean build-web-ui build-core

# MicroPython stubs must land in a separate typings/ directory rather than the
# venv -- inside the venv they shadow the CPython stdlib and type checking breaks.
stubs:
	uv pip install --target $(STUBS_PATH) --upgrade micropython-$(STUBS_FOR)-stubs==$(STUBS_VERSION)

lint:
	uv run ruff check

format:
	uv run ruff format

typecheck:
	uv run pyright

test:
	uv run pytest

check: lint typecheck test

# Third-party code in src/external/, pinned in vendor.toml. `vendor` writes the
# pinned refs so the git diff is the review; `vendor-check` only reports drift.
# Deliberately no target that pulls "latest" -- this code runs on a device that
# is awkward to reflash, so an update is a decision, not a side effect.
vendor:
	uv run python tools/vendor.py vendor

vendor-check:
	uv run python tools/vendor.py check

# One recursive copy of the whole tree, so adding a package under src/ no
# longer means editing this target -- which is what the old per-package
# `mkdir`/`put` list required. The wipe keeps /settings.json; use `provision`
# to push the local one deliberately.
upload: build
	$(MPREMOTE) run tools/wipe_device.py
	$(MPREMOTE) fs cp -r dist/. :
	$(MPREMOTE) reset

provision:
	@test -e ./settings.json || { echo "no ./settings.json to provision"; exit 1; }
	$(MPREMOTE) fs cp ./settings.json :settings.json

run-on-device: upload
	$(MPREMOTE) repl

# Web UI: same commands CI runs, so a local `make check-all` matches the
# pipeline without a container in between.
web-ui-lint:
	cd $(WEB_UI_PATH); pnpm run format:check; pnpm run lint; pnpm run typecheck

web-ui-test:
	cd $(WEB_UI_PATH); pnpm run test

web-ui-check: web-ui-lint web-ui-test

check-all: check web-ui-check
