# Board definitions

Out-of-tree MicroPython board definitions, built with
`make -C micropython/ports/esp32 BOARD_DIR=<abs path to one of these>`.

Each is the upstream `ESP32_GENERIC*` board for that chip **minus
`boards/sdkconfig.ble`**. Nothing in this project touches Bluetooth, and on the
C6 the stack was the difference between fitting the 2 MB app partition and
overflowing it by 28 KB once `src/` was frozen in. Upstream's own
`ESP32_GENERIC_S2` already omits the fragment, so this is a supported shape
rather than a workaround.

`mpconfigboard.h` is copied from the upstream board of the same chip at the
MicroPython version pinned in `.github/workflows/ci.yml`. When bumping that
version, diff these against upstream.

## What CI builds

All five: ESP32, S2, S3, C3 and C6.

S2 and S3 were out for a while. MicroPython v1.26.0 pinned
`espressif/esp_tinyusb: "~1.0.0"`, which stopped compiling against the TinyUSB
bundled with ESP-IDF v5.4.2 (`'CFG_TUD_CDC_EP_BUFSIZE' undeclared`) — a
disagreement between two upstream pins that a board definition cannot settle.
v1.28.0 replaced the dependency with MicroPython's own TinyUSB fork and the two
chips build again.

## Keeping these in step with upstream

`mpconfigboard.cmake` mirrors the upstream `SDKCONFIG_DEFAULTS` list exactly,
minus the Bluetooth fragment, and `mpconfigboard.h` is a copy. Both drift:
v1.28.0 introduced `boards/sdkconfig.riscv` for the C3 and C6, dropped
`boards/sdkconfig.usb`, and removed a define from the C6 header. Diff all ten
files against upstream whenever `MICROPYTHON_VERSION` moves.

## Chips that are not here

- **ESP32-H2, ESP32-P4** — no Wi-Fi.
- **ESP32-C2** — 272 KB SRAM; Microdot, mqtt_as and asyncio together do not
  leave enough room.
- **ESP8266** — a separate MicroPython port with far less RAM.
