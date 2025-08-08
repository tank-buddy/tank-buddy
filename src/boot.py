from network import WLAN, hostname
from config import Config
from time import sleep

AP_IP = "192.168.1.1"
AP_SUBNET_MASK = "255.255.255.0"

HOSTNAME = "tank-buddy"


def init_wifi_client(config):
    wlan = WLAN(WLAN.IF_STA)
    wlan.active(True)

    wlan.scan()
    wlan.connect(config.get("wifi.ssid"), config.get("wifi.key"))

    for _ in range(100):
        if wlan.isconnected():
            break
        sleep(0.1)

    if not wlan.isconnected():
        raise Exception("Could not connect to wifi.")


def init_wifi_access_point(config):
    wlan = WLAN(WLAN.IF_AP)
    wlan.active(True)
    wlan.ifconfig((AP_IP, AP_SUBNET_MASK, AP_IP, AP_IP))

    try:
        wlan.config(ssid=config.get("wifi.ssid"), key=config.get("wifi.key"))
    except Exception:
        wlan.config(ssid=config.get("wifi.ssid"))


def init_default_wifi_access_point():
    wlan = WLAN(WLAN.IF_AP)
    wlan.active(True)

    wlan.ifconfig((AP_IP, AP_SUBNET_MASK, AP_IP, AP_IP))

    wlan.config(ssid="TankBuddy")


config = Config("./conf.json")

hostname(HOSTNAME)

try:
    wifi_interface = config.get("wifi.interface")

    if wifi_interface == "C":
        init_wifi_client(config)
    elif wifi_interface == "AP":
        init_wifi_access_point(config)
    else:
        raise Exception("Configured interface does not exists")
except Exception:
    init_default_wifi_access_point()
