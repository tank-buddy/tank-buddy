# Freezes the application into a custom firmware image; see the CI `firmware`
# job. Only src/ is frozen -- the web UI is a filesystem asset under /www, not
# part of the image.
#
# The port's own manifest ($(PORT_DIR)/boards/manifest.py) is deliberately NOT
# included. It pulls in bundle-networking, umqtt, neopixel, onewire, dht,
# ds18x20, upysh and aioespnow, none of which this project imports, and together
# with src/ that overflowed the 2 MB app partition by ~46 KB. What is kept are
# the two parts that are not optional:
#
#   $(PORT_DIR)/modules  _boot.py, inisetup.py and flashbdev.py -- without these
#                        the device never mounts its filesystem, so /www and
#                        /settings.json would be unreachable.
#   extmod/asyncio       the whole application is one asyncio loop.
#
# Everything else this code needs (machine, network, socket, struct, json,
# binascii, ...) is built into the firmware as a C module, not frozen Python.
freeze("$(PORT_DIR)/modules")
include("$(MPY_DIR)/extmod/asyncio")

freeze("$(MPY_DIR)/../src")
