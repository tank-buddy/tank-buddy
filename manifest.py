# Freezes the application into a custom firmware image; see the CI `firmware`
# job. Only src/ is frozen -- the web UI is a filesystem asset under /www, not
# part of the image.
#
# `$(PORT_DIR)/boards/manifest.py` is the port's own default manifest (asyncio,
# bundle-networking, the standard drivers). Including it keeps this image a
# superset of stock MicroPython rather than a stripped one. It used to live at
# ports/esp32/modules/manifest.py, which no longer exists as of v1.26.0.
include("$(PORT_DIR)/boards/manifest.py")

freeze("$(MPY_DIR)/../src")
