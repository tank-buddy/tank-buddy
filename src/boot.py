from network import WLAN, hostname
from config import Config
from dns import Mdns, DumpDns, DnsRecord

AP_IP = "192.168.1.1"
AP_SUBNET_MASK = "255.255.255.0"

LOCAL_DOMAIN = "api.tank-buddy.local"


def getDnsRecord():
    return DnsRecord(LOCAL_DOMAIN, AP_IP)


def startMdns():
    mdns = Mdns(getDnsRecord())
    mdns.start()


def startDumpDns():
    dumpDns = DumpDns(getDnsRecord())
    dumpDns.start()


def initWifiClient(config):
    wlan = WLAN(WLAN.IF_STA)
    wlan.active(True)

    wlan.scan()
    wlan.connect(config.get("wifi.ssid"), config.get("wifi.key"))

    if not wlan.isconnected():
        raise Exception("Could not connect to wifi.")


def initWifiAccessPoint(config):
    wlan = WLAN(WLAN.IF_AP)
    wlan.active(True)
    wlan.ifconfig((AP_IP, AP_SUBNET_MASK, AP_IP, AP_IP))

    try:
        wlan.config(ssid=config.get("wifi.ssid"), key=config.get("wifi.key"))
    except Exception:
        wlan.config(ssid=config.get("wifi.ssid"))

    startDumpDns()


def initDefaultWifiAccessPoint():
    wlan = WLAN(WLAN.IF_AP)
    wlan.active(True)

    wlan.ifconfig((AP_IP, AP_SUBNET_MASK, AP_IP, AP_IP))

    wlan.config(ssid="TankBuddy")

    startDumpDns()


config = Config("./conf.json")

try:
    hostname(config.get("hostname"))
except Exception:
    hostname("tank-buddy")

try:
    wifiInterface = config.get("wifi.interface")

    if wifiInterface == "C":
        initWifiClient(config)
    elif wifiInterface == "AP":
        initWifiAccessPoint(config)
    else:
        raise Exception("Configured interface does not exists")

except Exception:
    initDefaultWifiAccessPoint()
