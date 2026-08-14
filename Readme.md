# Tank Buddy

Tank Buddy is a MicroPython project for the ESP32 that monitors the water level in a tank using a TOF200C (VL53L0X) infrared distance sensor. It publishes the level to Home Assistant over MQTT and serves a small web page from its own flash.

## Features

- 🚰 Real-time tank level monitoring using a VL53L0X sensor
- 🏠 Home Assistant integration via MQTT auto-discovery (fill level, distance, Wi-Fi signal)
- 🌐 Built-in web server with a single-page UI and a small JSON API
- 📶 Wi-Fi configuration in the browser (access point or client mode)
- 🌍 Multilingual UI (English and German, auto-detected from the browser)
- 🖨️ Printable 3D cases available on Thingiverse for ESP32 and sensor

## Getting Started

### Prerequisites

- [`uv`](https://docs.astral.sh/uv/) — installs the whole Python toolchain (ruff, pyright, pytest, mpremote, mpy-cross)
- [`Node.js`](https://nodejs.org/) 22.12+ and [`pnpm`](https://pnpm.io/) — for the web UI

Nothing needs Docker: both toolchains are version-pinned (`uv.lock`, `packageManager`), so local runs and CI execute the same commands.

### Installing MicroPython firmware

Flash the ESP32 with MicroPython first, following the official [ESP32 installation guide](https://docs.micropython.org/en/latest/esp32/tutorial/intro.html). CI also builds a firmware image with the application frozen in; see `manifest.py`.

### Installation

```bash
git clone https://github.com/tank-buddy/tank-buddy
cd tank-buddy
uv sync
make stubs
make upload
```

The device starts as an open access point named `TankBuddy`. Connect to it and open <http://192.168.1.1>.

### Configuration

All defaults live in [`src/settings.py`](src/settings.py) — one file, one place to look. Everything listed in its `MUTABLE_FIELDS` table can also be changed at runtime through the settings panel of the web UI; those changes are persisted to `/settings.json` on the device and layered over the defaults at boot.

Configurable at runtime:

- **Wi-Fi** — mode (`C` client / `AP` access point), SSID, key
- **MQTT** — enabled, broker host and port, user, password, topic prefix, discovery prefix
- **Tank** — height and minimum sensor distance, both in millimetres

`make upload` deliberately does **not** overwrite `/settings.json` on the device, so flashing new code keeps your configuration. To push the local `settings.json` on purpose:

```bash
make provision
```

In client mode the device is reachable over mDNS at <http://tank-buddy.local>.

> The device serves plain HTTP. It is intended for a trusted LAN; there is no TLS and no authentication.

### Home Assistant

Set `mqtt.enabled`, `mqtt.host` (and credentials if your broker needs them), then reboot. On every connect the device publishes retained discovery configs, so Home Assistant creates one **TankBuddy** device with three entities:

| Entity | Unit | Category |
|---|---|---|
| Fill level | % | primary |
| Distance to water | mm | diagnostic |
| Wi-Fi signal | dBm | diagnostic |

All three read from one retained JSON state topic (`tankbuddy/state`) via `value_template`. A last will on `tankbuddy/status` marks the entities unavailable when the device drops off, rather than leaving a stale value on screen.

MQTT only starts in client mode with a broker configured — in the recovery access point there is nothing to connect to.

## Development

| Task | Command |
|---|---|
| **Everything** (Python + web UI) | `make check-all` |
| Python: lint, typecheck, test | `make check` |
| Python: individually | `make lint`, `make format`, `make typecheck`, `make test` |
| Web UI: lint, typecheck, test | `make web-ui-check` |
| Refresh MicroPython stubs | `make stubs` |
| Re-fetch vendored dependencies | `make vendor` |
| Check vendored dependencies for updates | `make vendor-check` |
| Build everything into `dist/` | `make build` |
| Flash and reboot | `make upload` |
| Push local `settings.json` to the device | `make provision` |
| Flash and open the REPL | `make run-on-device` |

Web UI, from `web-ui/`: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`.

`pnpm dev` needs no second process — [MSW](https://mswjs.io/) mocks the device API in the browser. The same handlers back the test suite, which runs in a real headless Chromium via Vitest's browser mode (`pnpm exec playwright install chromium` once).

Install the git hooks with `uv run pre-commit install`.

### Updating vendored dependencies

Microdot, the VL53L0X driver and `mqtt_as` are copied into `src/external/` rather than installed, because `mip` has no lockfile and a reproducible firmware build needs exact versions. [`vendor.toml`](vendor.toml) pins each one.

```bash
make vendor-check      # what has moved upstream
# bump `ref` in vendor.toml
make vendor            # fetch exactly those refs
git diff               # this is the review
make check-all
```

There is deliberately no target that pulls "latest": this code runs on a device that is awkward to reflash, so taking an update is a decision, not a side effect.

## File structure

```
src/              MicroPython backend (sensor logic, HTTP API, MQTT, settings)
src/external/     Vendored upstream code (Microdot, VL53L0X, mqtt_as)
vendor.toml       Pins those copies to exact upstream refs
tests/            pytest suite, runs on CPython with device modules faked
tools/            Helper scripts executed on the device
web-ui/src/       Preact frontend, built into gzip-only static files
web-ui/mocks/     MSW handlers — one definition for dev server and tests
web-ui/tests/     Vitest browser-mode suite (real Chromium)
manifest.py       Freezes src/ into a custom firmware image
```

## 3D printed case

Printable models for the ESP32 and TOF sensor enclosure are on Thingiverse — ideal for durable, weatherproof installations.

## License

MIT.

## Links

- [`📦 VL53L0X MicroPython driver`](https://github.com/antirez/vl53l0x-nb)
- [`🌐 Microdot`](https://github.com/miguelgrinberg/microdot)
- [`📡 mqtt_as`](https://github.com/peterhinch/micropython-mqtt)
