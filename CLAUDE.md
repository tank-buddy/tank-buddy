# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TankBuddy is a water-tank level monitor that runs entirely on an **ESP32** (target board: `ESP32_GENERIC_C6`). MicroPython backend in `src/`, Preact web UI in `web-ui/`, both flashed onto the device. A VL53L0X (TOF200C) I²C distance sensor measures the gap to the water surface. The device publishes the level to Home Assistant over MQTT and serves a plain-HTTP API plus a single-page UI from its own flash.

**There is no TLS.** SSL was removed for RAM and latency reasons; it had already been removed once before (`806543f`) and re-added (`a4e5e5e`). Do not reintroduce it without discussing the RAM budget.

## Commands

Everything goes through the `Makefile`. **Nothing is containerised** — `uv` pins the Python toolchain, `pnpm` (via `packageManager`) the Node one, so local runs and CI execute the same commands.

| Task | Command |
|---|---|
| Install Python toolchain | `uv sync` |
| Install MicroPython stubs into `typings/` | `make stubs` |
| Re-fetch vendored deps at the refs pinned in `vendor.toml` | `make vendor` |
| Report vendored deps upstream has moved past | `make vendor-check` |
| Lint / format / typecheck / test (Python) | `make lint`, `make format`, `make typecheck`, `make test` |
| All Python checks | `make check` |
| All web-UI checks | `make web-ui-check` |
| **Everything** | `make check-all` |
| Build everything into `dist/` | `make build` |
| Build MicroPython part only | `make build-core` |
| Build web UI only | `make build-web-ui` |
| Flash + reboot device | `make upload` |
| Push local `settings.json` to the device | `make provision` |
| Flash and open REPL | `make run-on-device` |

Web UI, from `web-ui/`: `pnpm dev` (MSW mocks the API in-browser — no second process), `pnpm build`, `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`, `ANALYZE=1 pnpm build`.

Release, from the root: `pnpm exec semantic-release --dry-run --no-ci` (needs `GH_TOKEN`) prints the version the next release would get without touching anything. The root `package.json` is release tooling only — **nothing in it ships to the device.**

Git hooks: `uv run pre-commit install` (ruff check, ruff format, pyright).

### Tests

**Python** — `pytest` runs on **CPython**, not on the device. `tests/conftest.py` fakes the MicroPython-only modules (`machine`, `esp`, `micropython`, `network`), aliases the `u`-prefixed stdlib names used by vendored drivers, adds `gc.mem_free`/`gc.mem_alloc`, and injects `const` as a builtin because the vendored VL53L0X driver calls it without importing it. Keep that file a thin import shim — behaviour belongs in per-test fakes injected through the constructor-default pattern.

Run a single file the normal way: `uv run pytest tests/test_settings.py`.

**Web UI** — Vitest in **browser mode**, tests in `web-ui/tests/` mirroring `src/`. They run in a real headless Chromium via Playwright rather than a DOM simulation, because the app depends on a service worker (MSW) and on real layout. Consequently there is no `happy-dom`/`jsdom` and no `@testing-library/*`: rendering comes from `vitest-browser-preact`, queries and interaction from `vitest/browser`'s `page`.

The MSW handlers in `web-ui/mocks/` are the **single** mock definition — the dev server and the test suite start the same worker, so they cannot drift. Override per test with `worker.use(...)`.

They sit **outside `src/`** on purpose: `src/` is what ships. `main.tsx` imports them behind `import.meta.env.DEV`, which tree-shakes msw out of the production build — but that guard only covers one call site. An accidental `import { handlers }` from a component grows the bundle from **~16 kB to ~147 kB** with a green build (measured), which would swamp the device's flash budget. So `eslint.config.js` restricts imports of `mocks/**` to `src/main.tsx`, `tests/**` and the mocks themselves. Do not relax that.

CI needs `pnpm exec playwright install --with-deps chromium`; the download is cached on the resolved Playwright version.

## Architecture

### Boot sequence on device

1. **`src/boot.py`** — runs first. Loads the settings overlay, sets hostname `tank-buddy` (mDNS → `tank-buddy.local`), then brings up Wi-Fi per `Wifi.mode`: `"C"` = station, `"AP"` = access point at `192.168.1.1`. **Any** failure falls back to a default open AP named `TankBuddy`. On a successful station connection it sets `settings.Runtime.wifi_connected`, which is how `main.py` learns whether MQTT is worth starting. Never let an exception escape this file — an unreachable device cannot be reconfigured.
2. **`src/main.py`** — wires everything by hand (no DI container), then runs `asyncio.run(main())`: a measurement task, a Wi-Fi task in client mode, and `await api.start()` as the long-running server. Background tasks are wrapped in `supervise()`, which logs and restarts them; a crashed MQTT task must not take the web server down.
   - **`wifi_loop` keeps trying after boot.py has given up**, and owns the MQTT task. boot.py allows ten seconds and then falls back to the recovery AP — correct, because a device that blocks its own boot on a router is a device nobody can reconfigure — but that used to be final. Where the router and the device share a power switch, the router is still booting when those seconds pass, and the device stayed in its access point until someone power-cycled it. The loop takes the open recovery AP down on the first successful connection, since an open network that lingers for the life of the device is a worse trade than one that exists while it is needed.
   - `wifi_step()` is the decision, separated from the loop deliberately: no sleeping and no task creation, so the behaviour can be tested without a timer or a broker. **`Runtime.wifi_connected` is therefore no longer a boot-time fact** — it goes false again when the connection drops, which is what stops `mqtt_is_usable()` from keeping a dead client alive.
   - `main.py` has an `if __name__ == "__main__":` guard. MicroPython runs it as the boot script, where `__name__` is `"__main__"`, so nothing changes on device — it exists so the tests can import the module.

### Backend modules (`src/`)

Each subdirectory is a package whose `__init__.py` re-exports its class (`from hardware.hardware import Hardware as Hardware`), so imports read `from hardware import Hardware`. Follow that pattern for new modules. `settings.py` is a plain module, not a package.

- **`settings.py`** — the single source of truth for every configurable value. Defaults are module-level `const()` values exposed through namespace classes (`Wifi`, `Mqtt`, `Tank`, `Board`, `Http`, `Measurement`, `Runtime`). `MUTABLE_FIELDS` is the registry of runtime-changeable settings, keyed by dot path, and doubles as the validation table and the overlay allowlist — **this is the one place to add a new setting.** Replaces the former `config/` + `schema/` packages.
  - `const()` is a *compile-time inlining hint*: anything the overlay may rewrite must stay a plain class attribute. It accepts `int`, `str` and `bool` (verified with mpy-cross v6).
  - The overlay lives at `/settings.json`, deliberately outside `src/`, because `manifest.py` may freeze `src/` into the firmware and make it read-only. A missing or corrupt overlay silently falls back to defaults — same philosophy as the AP fallback.
- **`water_tank/`** — median-smoothed level over the last `Measurement.buffer_size` (5) readings. **`sample()` is the only method that touches the sensor**; `get_statistics()` is a pure read of the buffer. Keep that split: it keeps sensor I/O off the HTTP request path and lets the API and MQTT observe the same value. The fill percentage is computed here, on the device, so Home Assistant and the web UI cannot disagree.
  - `sample()` is **async and must stay async**. It drives the driver's `start_range_request()` / `reading_available()` / `get_range_value()` trio and awaits between polls. The tempting `tof.range` property busy-waits with `utime.sleep_ms`, which does *not* yield — it froze the entire asyncio loop, web server and MQTT keepalive included, for every measurement. That non-blocking API is the reason this particular driver fork is vendored.
- **`hardware/`** — flash/RAM stats and soft/hard reset. Every platform call is a constructor-injected default argument purely so tests can substitute fakes. Preserve that when adding hardware access. Resets are scheduled as an asyncio task with a delay so the HTTP response can still be sent.
- **`mqtt/`** — Home Assistant integration. Topic and payload construction are pure methods (`discovery_payload`, `state_payload`, `client_config`) separate from the async I/O, so they are testable without a broker. The `MQTTClient` is created through an injected factory.
- **`api/`** — routes registered as closures in `_register_api_routes()` / `_register_static_routes()` (split to stay under the complexity limit). Static files are served from `static_root` (`/www` on device, a tmp dir in tests): a pre-gzipped `.gz` first with `compressed=True`, otherwise the plain file, otherwise `index.html` for SPA routing — but anything under `api` returns 404. `Api.start()` is a coroutine, not Microdot's blocking `run()`.
  - The plain-file branch exists for exactly one asset: `apple-touch-icon.png`. gzip cannot shrink a PNG, so `vite-plugin-compression2` skips it (`skipIfLargerOrEqual`) and no `.gz` is ever emitted. **Everything textual still must be gzipped** — that is what the `include` pattern in `vite.config.ts` is for, and `.webmanifest` had to be added to it because the plugin default omits it.
- **`external/`** — vendored third-party code (Microdot, VL53L0X driver, mqtt_as). Excluded from ruff and pyright; treat as upstream — don't refactor, re-vendor instead.
  - **Vendored on purpose, not for lack of a package manager.** Microdot has no mip manifest and its docs say to copy the source files by hand. `mqtt_as` *does* ship a `package.json`, but its repo has no tags, so `mip install` could only pin to a moving branch, and the manifest drags in demo files. mip has no lockfile; for a reproducible CI firmware build a checked-in copy wins.
  - **`vendor.toml` is the pin**, and `make vendor` reproduces it. A copy without a pin is not a pin — it is a snapshot nobody can date, which is how this tree ended up on a pre-v2.4.0 Microdot missing a cookie-parsing fix that crashed request handling on a valueless cookie.
  - Some upstream files need a **documented rewrite** to work under our `external.` import root; `test_client.py` is one. The manifest records those, and `make vendor` **fails** rather than writing a broken file if a rewrite target disappears upstream. Never patch a vendored file in place — put the edit in the manifest so the next update carries it forward.
  - `src/external/microdot/__init__.py` is **ours**, not upstream: it rewrites the imports to absolute paths. It is deliberately absent from the manifest.

### API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/api` | MicroPython version, board, RAM/flash stats (diagnostics) |
| GET | `/api/level` | cached level: `level`, `distance_to_water`, `measured_distance`, `height`, `min_distance` |
| GET | `/api/settings` | current values of every `MUTABLE_FIELDS` entry |
| PATCH | `/api/settings` | validate + persist; returns `{success, reboot_required}` or 400 |
| PUT | `/api/system-operations/{soft-reset\|hard-reset}` | reset after a delay |

**Only the hard reset is offered in the UI.** A soft reset restarts the interpreter but leaves the radio and peripherals as they were, so picking it to apply a Wi-Fi change half works — and nothing in a label lets a user tell the two apart. The API keeps both; this is about what to put in front of someone. The restart is also offered inside the "reboot required" notice, which is the moment it is wanted, rather than only in the danger zone at the bottom.
| POST | `/api/web-ui` | start a UI update: create the staging tree |
| PUT | `/api/web-ui/{path}` | write one asset into the staging tree |
| POST | `/api/web-ui/commit` | swap staging in, drop the previous tree |

**Updating the web UI is browser-mediated.** The device has no TLS and cannot reach GitHub, so the page fetches the bundle over HTTPS and hands the files over plain HTTP on the LAN. **It fetches it from the Pages site, not from the release** — `https://tank-buddy.github.io/tank-buddy/web-ui.json`, deployed there by `pages.yml`. The page is served by the device over plain HTTP, so a release asset is cross-origin, and `github.com/…/releases/download/` sends no `Access-Control-Allow-Origin` on the download or on the redirect target behind it; Pages does. This is the same defect as the installer's, in a second place, and it failed the same way: `findUpdate` succeeded because `api.github.com` *is* permissive, so the panel offered an update, and the download was then blocked by CORS. It is one request now — the bundle names the version it carries, so a separate lookup would only add a second truth that can drift plus an unauthenticated 60-per-hour rate limit on the device's only cable-free update path. The suite could not see any of it: the MSW handler answered on `example.test`, where CORS never applies, which is why the handler now imports `BUNDLE_URL` from the app instead of restating it. Firmware cannot be refreshed this way at all — OTA needs two app partitions and `partitions-4MiB-ota.csv` gives each 1.5 MB against an image of ~1.9 MB — which is why the UI stays a filesystem asset. Three calls rather than one upload because there is no archive format on the device, and a staging tree means an abandoned update leaves the previous UI serving. The endpoint is unauthenticated like the rest of the API, so `is_safe_asset_path` is the only guard: one optional `assets/` level, a conservative character set, an extension the build emits, and a size ceiling. Do not loosen it to accept a path the build does not produce.

`web-ui/src/utils/api/types.ts` mirrors this surface; it and `MUTABLE_FIELDS` must be kept in sync.

### MQTT / Home Assistant

Three entities — fill level (%), distance (mm, diagnostic), Wi-Fi RSSI (dBm, diagnostic) — all reading from **one** retained JSON state topic via `value_template`, sharing one `device` block so HA groups them. Discovery configs are retained and republished on **every** connect, so the device reappears after a broker rebuild. A last will on the availability topic marks entities unavailable instead of leaving stale values.

**MQTT only starts in station mode with a configured broker** (`settings.mqtt_is_usable()`). In the recovery AP there is no broker to reach and a retrying client would only consume RAM while the user is trying to fix the configuration. This is the most important regression to preserve — it is covered by parametrised tests.

### Web UI (`web-ui/`)

Preact + Tailwind v4 + **Vite 8** (Rolldown/Oxc). **One page, no router**: `App.tsx` renders `NavBar`, `LevelIndicator` and `SettingsPanel` in one column. The settings are a second section, not a collapsed `<details>` — this is opened from a phone, where a disclosure panel only added a tap.

**The design language is iOS**, because that is the device it is used on:

- **Type costs nothing**: `--font-sans` is the system stack, so an iPhone renders real SF Pro with zero webfont bytes. Sizes follow the HIG (34 large title / 17 body / 13 footnote); anything numeric gets `tabular-nums` so the 5-second poll does not make figures jitter.
- **Tokens, not `dark:` pairs.** `index.css` defines semantic custom properties on `:root` and `[data-theme='dark']`, then lifts them into Tailwind with `@theme inline` (`--color-surface: var(--surface)`). Components therefore write `bg-surface text-label border-separator` with **no `dark:` counterpart** — which structurally removes the class of bug the `TONES` map in `Alert` was written to work around. Add a new colour by adding it in three places (both selectors and the `@theme inline` block), never as a raw hex in a component.
- `--brand` (`#09aba7`, the logo teal) is for **graphics only** — water, switch track, focus rings. White on it is 2.6:1, so filled buttons use `--accent` (`#06807d`, 4.9:1) and accent *text* uses `--brand-ink`, which flips per theme.
- **Grouped lists**: `Card` (rounded container + optional uppercase group header) holding `Row`s. Which element a `Row` renders follows from its props — `<label>` around a control, `<div>` for a read-only `value` or a `stacked` control group, `<button>` when it has `onClick` — so a row is never a `<label>` with nothing to associate. The hairline is an inset `after:` pseudo-element and `last:after:hidden` only works because a Row is a direct child of a Card.
- **Destructive actions go through `ConfirmSheet`**, a native `<dialog>` + `showModal()`: focus trap, inert background and Escape for free, no dependency. A mis-tap must not reboot the tank.
- Form controls (`Switch`, `SegmentedControl`) keep a **real `<input>`** stretched over the graphic at `opacity-0` rather than `sr-only`. A 1px clipped input is not a reliable pointer target, so `sr-only` would force `{force: true}` clicks in tests and drift from how a finger actually hits it.

**Theme switching** is `data-theme` on `<html>`, not `prefers-color-scheme`: `index.css` redefines the `dark` variant with `@custom-variant`, `src/utils/theme` owns `getTheme`/`setTheme`/`useTheme`, and an inline script in `index.html` resolves storage → system preference **before first paint** so the page never flashes white. `setTheme` also rewrites `<meta name="theme-color">`, which is the only way to tint the status bar of the home-screen app.

**Home screen without TLS.** `apple-mobile-web-app-*` meta tags, `manifest.webmanifest` and a 180×180 `apple-touch-icon.png` (iOS ignores SVG here) make "Add to Home Screen" work over plain HTTP. A service worker, offline caching and Chrome's install prompt all need a secure context and are therefore **not** implemented — do not add a PWA plugin. The status-bar style is `default`, not `black-translucent`: translucent forces white status-bar text, unreadable over the light theme. Regenerate the icon (teal tile, white glyph inset to 70 %, palette-reduced to keep it ~1.5 kB) rather than hand-editing it:

```sh
magick -background none icon.svg -resize 180x180 -colors 16 -strip PNG8:public/apple-touch-icon.png
```

**Tests address components through `data-testid`** (kebab-case, `<area>-<element>`, dot paths flattened with `-`: `row-mqtt-enabled`, `switch-mqtt-enabled`, `input-tank-height`, `save-button`, `confirm-accept`). Accessible queries stay where the test *is* the accessibility guarantee — `getByRole('meter')`, `getByLabelText`, `role="alert"` vs `role="status"`. Do not replace those with test ids.

Tooling: **ESLint (flat config) + Prettier**, not Biome. `eslint.config.js` runs `typescript-eslint` in `strictTypeChecked` — the type-aware rules (`no-floating-promises`, `no-misused-promises`) are the point for a UI made of `fetch` calls. `eslint-config-prettier` must stay last. Import sorting is Prettier's job via `prettier-plugin-organize-imports`.

> **TypeScript stays on 5.x on purpose.** `latest` is 7.x (the Go port), but `typescript-eslint` caps at `<6.1.0`, even in its canary. ESLint wins; revisit when typescript-eslint catches up.

Conventions: one directory per component with `index.tsx`; props interfaces are declared inline. No `clsx` — class lists are template literals, and the genuinely conditional cases (`Alert`, `Button`) use lookup maps. `SettingsPanel` is driven by a `FIELDS` table whose `path` values are the dot paths from `MUTABLE_FIELDS` (the first segment also selects the group card); it keeps form state as **raw strings** and diffs against the loaded snapshot, so only changed fields are patched and Save stays disabled until something actually differs.

i18n is static: `utils/i18n` imports both language files and picks one at module load. No dynamic import, no `window.__t`, no async `init()` — the old version cost a render-blocking round trip to a single-threaded server and made `t()` unsafe to call before it resolved.

**The build serves the flash-size constraint**: gzip output with originals deleted (`vite-plugin-compression2`), no sourcemaps, no modulePreload polyfill. Removing compression from the Vite config breaks static serving, because the backend looks for `.gz` first — see the note under `api/` for the one uncompressed exception. Current payload: **~23.3 kB** total (JS 13.0 / CSS 5.8 / SVG 1.6 / icon 1.5 / HTML 1.1 / manifest 0.25, all gzipped except the PNG) — measured, not carried over; the figure had drifted about a kilobyte behind the dependency bumps.

**MSW's service worker must never reach the device.** `msw init` puts `mockServiceWorker.js` (9.6 kB, ~3.2 kB gzipped) in `public/`, which Vite copies verbatim into the build. Two guards in `vite.config.ts`: the compression plugin excludes it, and `excludeMockWorker` deletes it and then **throws** if anything named like it survives. Do not weaken that to a warning — it would pass CI and only show up as lost flash.

`pnpm-workspace.yaml` holds `allowBuilds` and a `peerDependencyRules` entry for `vite-prerender-plugin`, which still declares vite 5-7 while being instantiated unconditionally by `@preact/preset-vite`. Re-check that when bumping Vite.

> **`allowBuilds`, not `onlyBuiltDependencies`.** pnpm 11 stopped treating the older list as a decision, so its entries were ignored and `pnpm install` failed with `ERR_PNPM_IGNORED_BUILDS`. This class of break is invisible locally — an existing `node_modules` makes pnpm skip the step — so reproduce it the way CI sees it: copy `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` into an empty directory and run `pnpm install --frozen-lockfile` there.

### Packaging

**One flashable file per board.** `make flash-image FIRMWARE=... CHIP=... BOARD=...` builds a LittleFS image from `web-ui/dist` and merges it with the firmware at the `vfs` offset, so a single write at `0x0` produces a complete device. The release workflow does the same for every board.

The geometry is not guessed — it was read off an ESP32-C6 running this firmware: `os.statvfs('/')` returns block size 4096 and 512 blocks, and `Partition.find(Partition.TYPE_DATA)` puts `vfs` at `0x200000` with exactly those 2 MiB. `esp32.Partition` on the device is the authority; `tools/build_littlefs_image.py` takes a block count for boards that differ, and mounts the image back before writing it out.

The whole path is verified on hardware: erase the flash, write the merged image at `0x0`, and the device comes up with `/www` mounted, the `TankBuddy` access point at 192.168.1.1, and no `boot.py` in the filesystem — meaning MicroPython accepted the image rather than reformatting it.

Two artefacts per board, and the difference matters: `tank-buddy-<board>-full.bin` writes the whole chip and takes `/settings.json` with it, so it is a first install or a factory reset. `tank-buddy-<board>.bin` is firmware only and leaves the filesystem alone, so an existing device keeps its configuration *and* its interface.


`make build-core` keeps `main.py` and `boot.py` as plain `.py` (MicroPython requires that for the boot entry points) and cross-compiles every other module to `.mpy` with `mpy-cross -O2`. It prunes `__pycache__`/`.pyc`/`.DS_Store` afterwards, because local pytest runs leave CPython bytecode in `src/` that must not reach the device.

`make upload` wipes the device with `tools/wipe_device.py` — otherwise modules deleted from the source tree linger in flash and stay importable — then does one recursive `mpremote fs cp -r dist/. :`. **Adding a top-level package under `src/` needs no Makefile change.** The wipe preserves `/settings.json`; `make provision` pushes the local one on purpose.

MicroPython, the ESP-IDF image and the stubs move as one: `MICROPYTHON_VERSION` in both workflows, the `espressif/idf` container tag (the version `ports/esp32/README.md` recommends for that release), and `STUBS_VERSION` in the `Makefile`. Bumping only one of them is how the stubs came to sit two releases behind the firmware, which hid a real signature drift (`gc.collect()` is `int | None`, not `None`).

`manifest.py` is the alternative path: it freezes all of `src/` into a custom firmware image, which is what the CI `firmware` job produces (MicroPython v1.28.0 on ESP-IDF v5.5.1) for the five boards defined in [`boards/`](boards/README.md) — ESP32, S2, S3, C3 and C6.

Three things about that image are easy to get wrong:

- **It does not contain the web UI.** `manifest.py` freezes `src/` only; the UI is a filesystem asset under `/www`. The CI artefacts are named `firmware-<board>` rather than the project name for exactly this reason — they are a build check, not something to hand to a user.
- **The port's own manifest is deliberately not included.** It pulls in `bundle-networking`, `umqtt`, `neopixel`, `onewire`, `dht`, `ds18x20`, `upysh` and `aioespnow`, none of which this project imports, and with `src/` alongside them the app overflowed its 2 MB partition. What is kept is not optional: `$(PORT_DIR)/modules` (which mounts the filesystem) and `extmod/asyncio`.
- **`FROZEN_MANIFEST` must be absolute.** A relative path looks right next to `make -C`, but `makemanifest.py` runs from `build-*/esp-idf/main`, so `../../../manifest.py` resolves to `ports/esp32/manifest.py`.

> **Firmware is not updated over the air here.** OTA needs two app partitions; `partitions-4MiB-ota.csv` gives each 1.5 MB against an app of ~1.50 MB. It would fit with a few kilobytes to spare, and two slots would take 3 of the 4 MB — no headroom for the app and far less filesystem. So the web UI stays a filesystem asset rather than being frozen in: the filesystem is the only part of the device that is refreshed without a cable.

### Releases

**Releases are cut by semantic-release from the commit messages.** `release.yml` runs on every push to `main` and usually does nothing: `build(deps)` is not a releasable type, so a week of Dependabot updates produces no release, while a `fix:` gives a patch and a `feat:` a minor. `tagFormat` is `v${version}`, matching the tags that existed before. There is no manual step, and `workflow_dispatch` takes a `dry_run` input (**default true**) so the whole chain can be exercised without cutting anything.

Four things about that pipeline are load-bearing:

- **The version is worked out before the builds, in its own `version` job.** `UI_VERSION` is compiled into the web UI, and the device compares that value against the version inside the published bundle — if the two differ, every device offers an update forever. The job runs `semantic-release --dry-run`, which stops before `prepare`, and takes the value from `verifyReleaseCmd`. It passes the **tag** (`v1.2.3`) rather than the bare version, because that is what the bundle records. There is no tag yet at that point, which is why `github.ref_name` cannot be used.
- **The jobs are chained with `needs`, not triggered by the release event.** A release created with the automatic `GITHUB_TOKEN` starts no workflow run — GitHub's recursion guard, which applies to pushed tags as well. Triggering the builds from `release: created` would leave every release without assets. The same guard is why the release commit semantic-release pushes back to `main` cannot loop.
- **Both jobs that run semantic-release need `contents: write` and a ruleset bypass**, including the one that only works out a number. `verifyAuth` sits in semantic-release's core: it runs a real `git push --dry-run HEAD:main` before any plugin loads and **regardless of `--dry-run`**, and fails the whole run with `EGITNOPERMISSION` otherwise. `main` also carries two rulesets (`pull_request`, `required_status_checks`), so the token needs the permission *and* the bot needs to be exempt from them. `github-actions[bot]` cannot be added to a bypass list as an `Integration` — that returns 422, since GitHub's own Actions app is not installed in the organisation — but it **can** as a `User`, with actor id `41898282`. That is what both rulesets carry, so the pull-request requirement still applies to everyone else. The alternatives are a GitHub App or a PAT, and [semantic-release advises against the latter](https://semantic-release.gitbook.io/semantic-release/recipes/ci-configurations/github-actions).
- **The plugins that write are only loaded when publishing**, selected by `SEMANTIC_RELEASE_PUBLISH` in `release.config.mjs`. Working out a version needs neither `changelog`, `git` nor `github`, so the analysing run does not load them — it is faster and has fewer ways to fail. Note what this does *not* buy: it was first written to keep that job on `contents: read`, and that does not work, because the check that blocks it is the core one above rather than `@semantic-release/git`'s own. The config is `.mjs` rather than JSON because the condition — and this reasoning — cannot be expressed in JSON.
- **`@semantic-release/exec` renders commands as Lodash templates**, so `${...}` is interpolated before the shell sees it. `${GITHUB_OUTPUT:-/dev/null}` fails with `SyntaxError: Unexpected token ':'`. `verifyReleaseCmd` therefore writes `.release-version` (gitignored) and the workflow turns that into job outputs — which also makes it testable outside Actions. For the same reason every template in that file is in **single** quotes: a JS template literal would consume `${nextRelease.version}` before semantic-release saw it.
- **`pages.yml` is called, not triggered.** Since *Release* now runs on every push and only sometimes publishes, a `workflow_run` trigger could not tell a release from an ordinary commit. It keeps its own `push`/`workflow_dispatch` triggers for documentation-only changes and additionally exposes `workflow_call`, which `release.yml` uses as its last job.

`tools/set_project_version.py` writes the version into `[project]` of `pyproject.toml`. That value is decorative — `[tool.uv] package = false`, nothing builds or publishes this project — but a file permanently claiming `0.1.0` while the tags have moved on misleads whoever reads it next. The script is line-based because `tomllib` cannot write and every writer that could would drop the comments, and most of that file is ruff and pyright configuration with the reasoning written beside each setting.

### Browser installer (`docs/`)

An ESP Web Tools page on GitHub Pages, from which someone flashes a blank board over Web Serial. **The flash images are copied onto the Pages site and served from it** — `.github/workflows/pages.yml` downloads the release's `-full.bin` assets into `_site/firmware/` and `tools/build_pages_manifest.py` writes the manifest next to them, with `path` values relative to that manifest.

That indirection is not a preference, and the obvious shortcut does not work. **A browser cannot fetch a GitHub release asset from another origin at all.** `github.com/…/releases/download/` answers a cross-origin request with a 302 carrying no `Access-Control-Allow-Origin`, and the `release-assets.githubusercontent.com` it redirects to sends no CORS headers either — so does the `api.github.com/…/releases/assets/{id}` route, whose own 302 *is* permissive but whose target is not. The page used to build a `blob:` manifest in the browser from the release API and point each part at `browser_download_url`; it failed with a CORS error *after* the user had plugged the board in and the chip had been detected. Do not reintroduce a manifest that references `github.com`, however convenient — verify with `curl -I -H 'Origin: …'` rather than assuming, and note that `esp-web-tools` resolves `parts[].path` against the manifest URL, falling back to `location` only for `blob:`/`data:` manifests (that fallback is why the old version needed absolute URLs in the first place).

The consequences are worth stating, because they overturn what the page was designed around:

- **Pages must be served by Actions, not from a branch folder.** Publishing from `main:/docs` was `build_type: legacy` in the Pages API; five 4 MB images have no business in git. Switching that is a repository setting, not something in this tree.
- **A release now costs a Pages deploy**, so the site is redeployed per release rather than never. `pages.yml` triggers on `workflow_run` after *Release* rather than on the `release` event, because *Release* itself triggers on `created` and the two would race — the manifest would be built before `publish` had uploaded anything.
- **The page no longer calls the GitHub API**, which also removes an unauthenticated 60-requests-per-hour-per-IP rate limit from the path a first-time user walks.

> **`Detected flash size: undefined` in the installer log is upstream and expected.** `esptool-js` fails to read the flash ID in the browser on several chips ([esptool-js#217](https://github.com/espressif/esptool-js/issues/217)) where Python `esptool` reads it fine. It is a warning, not the failure — the images are written from offset 0 with an explicit size, so nothing depends on the detection.

## Conventions

- Python module/function/variable names are `snake_case`. **The API and settings are snake_case too** (`tank.min_distance`) — the old camelCase JSON boundary is gone along with `Config`/`DictSchema`.
- Magic values belong in module- or class-level constants.
- Code targets MicroPython, not CPython: no f-string `=`, standard-library imports limited to what the stubs provide.
- **Annotate everything, including return types.** MicroPython discards annotations at compile time (verified: annotation names do not appear in the `.mpy` bytecode), so they cost no RAM on device.
- The `typing` module does **not** exist on device. Import it behind `try: from typing import ... except ImportError: pass` and write annotations as strings (`"str | None"`, `"dict[str, Any]"`, `"Callable[[], int]"`). Never `Optional[X]`. `UP037` and `SIM105` are disabled project-wide for exactly this reason.
- There is no `enum` module. Use module-level `const()` values plus a namespace class (see `WifiMode`).
- Ruff covers `src/` and `tests/`, skipping `src/external/`. pyright runs in **strict** mode. Where vendored code degrades types to `Unknown`, the relaxation is a documented file-level `# pyright:` comment in that file, not a global setting.
- Prettier owns web-UI formatting (single quotes, no semicolons, spaces, 80 columns); ESLint owns correctness only.
- `settings.json` is gitignored; there is no tracked template — `settings.py` holds the defaults.

## Known gaps

- `src/external/microdot/__init__.py` imports `TestClient`, so `test_client.mpy` (~3.7 KB) is loaded into RAM at boot. **Measured and settled: not worth fixing.** A C6 running this firmware reports `gc.mem_free() == 321504`, so the module costs about 1 % of free RAM — and having `TestClient` on the device turned out to be useful, since it exercises the HTTP routes over the REPL without a network.
- `mqtt_v5_properties.mpy` (~1.8 KB) ships but is only imported lazily when MQTT v5 is enabled, which it is not. It costs flash, not RAM — deliberately left alone.
- `noUncheckedIndexedAccess` is off in the web-UI tsconfig. Several places index records without guarding; enabling it would be a real tightening but touches a lot.
- TypeScript is held at 5.x by `typescript-eslint` (see the Web UI section).
