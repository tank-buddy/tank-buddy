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

| Board | Chip | Built in CI |
|---|---|---|
| `TANKBUDDY_ESP32` | ESP32 | yes |
| `TANKBUDDY_C3` | ESP32-C3 | yes |
| `TANKBUDDY_C6` | ESP32-C6 | yes |
| `TANKBUDDY_S2` | ESP32-S2 | no — see below |
| `TANKBUDDY_S3` | ESP32-S3 | no — see below |

## Why S2 and S3 are defined but not built

They are the only two boards that pull in `boards/sdkconfig.usb`, and that path
is currently broken upstream:

```
esp_tinyusb/usb_descriptors.c:172: error: 'CFG_TUD_CDC_EP_BUFSIZE' undeclared
```

MicroPython v1.26.0 pins `espressif/esp_tinyusb: "~1.0.0"` in
`ports/esp32/main/idf_component.yml`, and that component does not compile
against the TinyUSB bundled with ESP-IDF v5.4.2 — the macro was renamed. It is
a mismatch between two upstream pins, not something this repository can fix from
the board definition.

The definitions are kept because they are correct and cost nothing: add the two
names back to the matrix in `ci.yml` once MicroPython moves the component pin or
the IDF version changes. Until then, building for those chips means building
locally and accepting the same error, or dropping `boards/sdkconfig.usb` from
the board — which sidesteps TinyUSB entirely at the price of moving the REPL
from native USB to UART.

## Chips that are not here

- **ESP32-H2, ESP32-P4** — no Wi-Fi.
- **ESP32-C2** — 272 KB SRAM; Microdot, mqtt_as and asyncio together do not
  leave enough room.
- **ESP8266** — a separate MicroPython port with far less RAM.
