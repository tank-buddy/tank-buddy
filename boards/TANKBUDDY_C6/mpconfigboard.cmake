# TankBuddy's own board definition, built out of tree via BOARD_DIR.
#
# It is the upstream ESP32_GENERIC_C6 board without boards/sdkconfig.ble: nothing in
# this project touches Bluetooth, and on the C6 the stack alone was more than
# the app partition had left once src/ was frozen in.

set(IDF_TARGET esp32c6)

set(SDKCONFIG_DEFAULTS
    boards/sdkconfig.base
    boards/sdkconfig.c6
)
