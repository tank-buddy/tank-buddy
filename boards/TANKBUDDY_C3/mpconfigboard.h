// Copied from the upstream board of the same chip at MicroPython v1.26.0 and
// kept in step with MICROPYTHON_VERSION in .github/workflows/ci.yml. Only the
// board name and the Bluetooth switch differ.

#define MICROPY_HW_BOARD_NAME               "TankBuddy (ESP32-C3)"
#define MICROPY_HW_MCU_NAME                 "ESP32C3"

// No Bluetooth anywhere in this project; sdkconfig.ble is left out of
// mpconfigboard.cmake and this makes the same statement to MicroPython.
#define MICROPY_PY_BLUETOOTH                (0)

// Enable UART REPL for modules that have an external USB-UART and do not
// use native USB.
#define MICROPY_HW_ENABLE_UART_REPL         (1)
