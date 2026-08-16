# The network stubs are only partially typed; nothing here depends on the
# shapes they leave unknown.
# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false
from network import WLAN, hostname
from time import sleep

import settings
from settings import Runtime, Wifi, WifiMode

_POLL_INTERVAL_S = 0.1
_RECOVERY_SSID = "TankBuddy"


def init_wifi_client() -> None:
    wlan = WLAN(WLAN.IF_STA)
    wlan.active(True)

    wlan.scan()
    wlan.connect(Wifi.ssid, Wifi.key)

    for _ in range(int(Wifi.connect_timeout_s / _POLL_INTERVAL_S)):
        if wlan.isconnected():
            return
        sleep(_POLL_INTERVAL_S)

    raise OSError("Could not connect to wifi.")


def init_wifi_access_point() -> None:
    wlan = WLAN(WLAN.IF_AP)
    wlan.active(True)
    wlan.ifconfig((Wifi.ap_ip, Wifi.ap_netmask, Wifi.ap_ip, Wifi.ap_ip))

    try:
        wlan.config(ssid=Wifi.ssid, key=Wifi.key)
    except Exception:
        wlan.config(ssid=Wifi.ssid)


def init_default_wifi_access_point() -> None:
    """Last resort: an open AP so a misconfigured device stays reachable."""
    wlan = WLAN(WLAN.IF_AP)
    wlan.active(True)
    wlan.ifconfig((Wifi.ap_ip, Wifi.ap_netmask, Wifi.ap_ip, Wifi.ap_ip))
    wlan.config(ssid=_RECOVERY_SSID)


# Nothing below may raise. Any escape here leaves the device unreachable with
# no way to reconfigure it short of a reflash.
try:
    settings.load_overlay()
except Exception as error:
    print("settings overlay ignored:", error)

try:
    hostname(Wifi.hostname)
except Exception as error:
    print("hostname not set:", error)

try:
    if Wifi.mode == WifiMode.CLIENT:
        init_wifi_client()
        # main.py reads this to decide whether starting MQTT makes sense.
        Runtime.wifi_connected = True
    elif Wifi.mode == WifiMode.ACCESS_POINT:
        init_wifi_access_point()
    else:
        raise ValueError("Configured interface does not exist")
except Exception as error:
    print("falling back to recovery access point:", error)
    try:
        init_default_wifi_access_point()
    except Exception as fallback_error:
        print("recovery access point failed:", fallback_error)
