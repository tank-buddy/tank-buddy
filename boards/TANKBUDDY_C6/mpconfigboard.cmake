# TankBuddy's own board definition, built out of tree via BOARD_DIR.
#
# It is the upstream ESP32_GENERIC_C6 board without boards/sdkconfig.ble: nothing in
# this project touches Bluetooth, and on the C6 the stack alone was more than
# the app partition had left once src/ was frozen in.
#
# Mirror the upstream list exactly when bumping MICROPYTHON_VERSION -- v1.28.0
# introduced boards/sdkconfig.riscv for the C3 and C6 and dropped
# boards/sdkconfig.usb, and a stale list here builds the wrong chip support.

set(IDF_TARGET esp32c6)

set(SDKCONFIG_DEFAULTS
    boards/sdkconfig.base
    boards/sdkconfig.riscv
    boards/sdkconfig.c6
)
