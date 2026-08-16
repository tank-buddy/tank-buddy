// Copied from the upstream board of the same chip at the MicroPython version
// pinned in .github/workflows/ci.yml. Only the board name and the Bluetooth
// switch differ; diff against upstream when bumping that version.

#define MICROPY_HW_BOARD_NAME               "TankBuddy (ESP32)"
#define MICROPY_HW_MCU_NAME                 "ESP32"

// No Bluetooth anywhere in this project; sdkconfig.ble is left out of
// mpconfigboard.cmake and this makes the same statement to MicroPython.
#define MICROPY_PY_BLUETOOTH                (0)

// This device has no TLS -- see the note at the top of CLAUDE.md -- and mqtt_as
// only imports ssl behind a branch we never take. Dropping the module lets the
// linker discard what mbedTLS pulls in behind it, which is what decides whether
// two OTA app partitions fit into 4 MB at all.
#define MICROPY_PY_SSL                      (0)

// Enable UART REPL for modules that have an external USB-UART and do not
// use native USB.
#define MICROPY_HW_ENABLE_UART_REPL         (1)
