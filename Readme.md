<p align="center">
  <img src="web-ui/public/tank-buddy.svg" width="110" alt="">
</p>

<h1 align="center">Tank Buddy</h1>

<p align="center">
  How full is a tank you cannot see into? This answers that, on an ESP32, in Home Assistant and on your phone.
</p>

A VL53L0X (TOF200C) measures the distance down to the water surface. The device works out the fill level itself, publishes it to Home Assistant over MQTT, and serves a web interface from its own flash — no cloud, no account, nothing to install on the phone.

## Features

- **Real fill level, computed on the device**, so Home Assistant and the web interface can never disagree
- **Home Assistant via MQTT auto-discovery** — fill level, distance and Wi-Fi signal as one device with three entities
- **A web interface built for a phone**: iOS design language, light and dark, and it can be added to the home screen
- **Configured in the browser** — Wi-Fi, tank geometry and which pins the sensor is wired to
- **Rejoins the network by itself** when the router comes up later than the device, which is the normal case when both share a power switch
- **Updates its own interface over your network**, keeping your configuration
- **Five ESP32 variants**, installed from a browser with nothing to set up locally
- English and German, picked from the browser

## Install

**[Open the installer](https://tank-buddy.github.io/tank-buddy/)** and press Connect. It writes the whole chip — bootloader, firmware and web interface — in one go, with nothing to install on your computer.

Web Serial only exists in desktop Chrome, Edge and Opera. From another browser, take `tank-buddy-<board>-full.bin` from the [latest release](https://github.com/tank-buddy/tank-buddy/releases/latest) and write it yourself:

Replace `PORT` with the serial port the board appears on — `/dev/cu.usbmodem*` on macOS, `/dev/ttyUSB*` or `/dev/ttyACM*` on Linux, `COM*` on Windows.

```sh
esptool --port PORT write-flash 0x0 tank-buddy-TANKBUDDY_C6-full.bin
```

### Supported boards

| Chip | Board | Note |
|---|---|---|
| ESP32 | `TANKBUDDY_ESP32` | GPIO0 is a strapping pin — wire the sensor elsewhere |
| ESP32-S2 | `TANKBUDDY_S2` | |
| ESP32-S3 | `TANKBUDDY_S3` | GPIO0 is a strapping pin |
| ESP32-C3 | `TANKBUDDY_C3` | |
| ESP32-C6 | `TANKBUDDY_C6` | the board this is developed on |

4 MB of flash is enough. The ESP32-H2 and P4 have no Wi-Fi, the C2 has too little RAM, and the ESP8266 is a different port — see [`boards/README.md`](boards/README.md).

### First run

1. The device opens an open access point named `TankBuddy`. Join it from a phone.
2. Open <http://192.168.1.1>.
3. Set your Wi-Fi, the tank height, the minimum sensor distance and **which pins the sensor is wired to** — the defaults (SCL 1, SDA 0) suit the C6 and will not suit every board.
4. Save, then press **Restart now** in the notice that appears — Wi-Fi settings only take effect after a restart. The device is then reachable at <http://tank-buddy.local>.

If a device answers with "no web interface is installed yet", it was flashed with firmware alone. Install the interface from the settings page of another device, or push it with `mpremote fs cp -r web-ui/dist/. :www/`.

### When the power comes back

If the router is still booting when the device is, the device does not give up on it. It opens its recovery access point after ten seconds so it is never unreachable, keeps trying in the background, and joins the network as soon as it appears — then takes the open access point down again. Nothing to press.

> The device serves plain HTTP. It is meant for a trusted LAN; there is no TLS and no authentication.

## Updating

The **web interface updates itself over your network**: the Software section of the settings page checks for a release, downloads it in your browser and uploads it to the device. Your configuration survives, and no cable is involved. The device has no TLS and cannot reach GitHub on its own, which is why the browser does the fetching.

**Firmware needs a cable**, and rarely. Two images per release, and the difference matters:

| Asset | Writes | Keeps your settings |
|---|---|---|
| `tank-buddy-<board>-full.bin` | whole chip, interface included | no — first install or factory reset |
| `tank-buddy-<board>.bin` | firmware only | yes, and the interface too |

There is no over-the-air firmware update. It would need two app partitions, and on 4 MB that leaves the app without headroom and the filesystem with almost nothing.

## Configuration

All defaults live in [`src/settings.py`](src/settings.py) — one file, one place to look. Everything in its `MUTABLE_FIELDS` table can be changed at runtime from the settings panel; changes are persisted to `/settings.json` on the device and layered over the defaults at boot.

- **Wi-Fi** — mode (`C` client / `AP` access point), SSID, key
- **MQTT** — enabled, broker host and port, user, password, topic prefix, discovery prefix
- **Tank** — height and minimum sensor distance, in millimetres
- **Sensor wiring** — the I²C SCL and SDA pins

`make upload` deliberately does **not** overwrite `/settings.json`, so flashing new code keeps your configuration. To push the local one on purpose:

```sh
make provision
```

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

Prerequisites: [`uv`](https://docs.astral.sh/uv/) for the whole Python toolchain (ruff, pyright, pytest, mpremote, mpy-cross, esptool) and [Node.js](https://nodejs.org/) 22.12+ with [`pnpm`](https://pnpm.io/) for the web UI. Nothing needs Docker — both toolchains are version-pinned (`uv.lock`, `packageManager`), so local runs and CI execute the same commands.

```sh
git clone https://github.com/tank-buddy/tank-buddy
cd tank-buddy
uv sync
make stubs
make upload
```

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
| Merge one flashable file | `make flash-image FIRMWARE=... CHIP=esp32c6 BOARD=TANKBUDDY_C6` |

Firmware itself is built in CI, out of tree, from the definitions in [`boards/`](boards/README.md) — MicroPython v1.28.0 on ESP-IDF v5.5.1. `make flash-image` takes one of those `firmware.bin` files and merges it with a LittleFS image of the web UI, which is what makes a single write at `0x0` produce a complete device.

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
tools/            Build helpers (flash image, update bundle) and device scripts
web-ui/src/       Preact frontend, built into gzip-only static files
web-ui/mocks/     MSW handlers — one definition for dev server and tests
web-ui/tests/     Vitest browser-mode suite (real Chromium)
manifest.py       Freezes src/ into a custom firmware image
boards/           Board definitions, one per supported chip
docs/             The browser installer, published with GitHub Pages
```

## 3D printed case

Enclosures for the board and the sensor are drawn and will be published on Thingiverse — the sensor has to sit in the tank lid looking straight down at the water, and it needs to stay dry doing it. Not uploaded yet; this section gets the link when they are.

## License

MIT — see [`LICENSE`](LICENSE). The third-party code vendored under `src/external/` is MIT as well; [`NOTICE`](NOTICE) records the attributions.

## Links

- [`📦 VL53L0X MicroPython driver`](https://github.com/antirez/vl53l0x-nb)
- [`🌐 Microdot`](https://github.com/miguelgrinberg/microdot)
- [`📡 mqtt_as`](https://github.com/peterhinch/micropython-mqtt)
