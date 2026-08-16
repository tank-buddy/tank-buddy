// Copied from the upstream board of the same chip at the MicroPython version
// pinned in .github/workflows/ci.yml. Only the board name and the Bluetooth
// switch differ; diff against upstream when bumping that version.

#define MICROPY_HW_BOARD_NAME               "TankBuddy (ESP32-C6)"
#define MICROPY_HW_MCU_NAME                 "ESP32C6"

// No Bluetooth anywhere in this project; sdkconfig.ble is left out of
// mpconfigboard.cmake and this makes the same statement to MicroPython.
#define MICROPY_PY_BLUETOOTH                (0)

// Enable UART REPL for modules that have an external USB-UART and do not
// use native USB.
#define MICROPY_HW_ENABLE_UART_REPL         (1)
