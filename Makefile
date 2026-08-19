STUBS_FOR=esp32
STUBS_VERSION=1.28.*
STUBS_PATH=typings
MPY_CROSS=uv run mpy-cross-v6
MPREMOTE=uv run mpremote
ESPTOOL=uv run esptool
BASE_PATH ?= $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
# The workspace root; pnpm --filter targets a package from anywhere inside it.
DEVICE_UI_DIRECTORY=web/apps/device-ui

# Every target is a command, not a file. Without this, `clean`, `build` and
# `dist` would be shadowed by the dist/ directory they operate on.
.PHONY: clean build-web-ui build-installer build-core build \
        stubs lint format typecheck test check \
        web-ui-lint web-ui-test web-ui-check check-all \
        vendor vendor-check \
        upload provision run-on-device \
        flash-image

clean:
	rm -Rf dist

build-web-ui:
	pnpm install --frozen-lockfile
	pnpm --filter @tank-buddy/device-ui build

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
	cp -a ./$(DEVICE_UI_DIRECTORY)/dist/. ./dist/www/

build-installer:
	pnpm install --frozen-lockfile
	pnpm --filter @tank-buddy/installer build

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
	pnpm run format:check
	pnpm -r run lint
	pnpm -r run typecheck

web-ui-test:
	pnpm --filter @tank-buddy/device-ui test

web-ui-check: web-ui-lint web-ui-test

check-all: check web-ui-check

# ---------------------------------------------------------------------------
# One flashable file
# ---------------------------------------------------------------------------

# The vfs partition on every board this project builds for, read off a device:
#   >>> [p.info() for p in Partition.find(Partition.TYPE_DATA)]
#   (1, 129, 2097152, 2097152, 'vfs', False)
VFS_OFFSET=0x200000

# A firmware image freezes src/ but not the web UI, so flashing firmware alone
# leaves a device with no interface -- it serves the "nothing installed yet"
# page instead. This merges the firmware with a prebuilt filesystem holding the
# UI, so one write at 0x0 produces a complete device.
#
#   make flash-image FIRMWARE=path/to/firmware.bin CHIP=esp32c6 BOARD=TANKBUDDY_C6
#
# CI has a firmware.bin per board; locally, download one from the run or build
# it yourself. Verified end to end on an ESP32-C6: erase-flash, write this at
# 0x0, and the device comes up with /www mounted and the access point running.
flash-image: build-web-ui
	@test -n "$(FIRMWARE)" || (echo "set FIRMWARE=<path to firmware.bin>" && false)
	mkdir -p dist
	uv run python tools/build_littlefs_image.py $(DEVICE_UI_DIRECTORY)/dist dist/littlefs.bin
	$(ESPTOOL) --chip $(CHIP) merge-bin -o dist/tank-buddy-$(BOARD).bin \
		--flash-size 4MB 0x0 $(FIRMWARE) $(VFS_OFFSET) dist/littlefs.bin
