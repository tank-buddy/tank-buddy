from network import WLAN, hostname
from config import Config

def initWifiClient(config):
    wlan = WLAN(WLAN.IF_STA)
    wlan.active(True)
    
    wlan.scan()
    print('init wifi client')
    wlan.connect(config.get('wifi.ssid'), config.get('wifi.key'))

    if not wlan.isconnected():
        raise Exception("Could not connect to wifi.")
    
    print(wlan.ifconfig())

def initWifiAccessPoint(config):
    wlan = WLAN(WLAN.IF_STA)
    wlan.active(True)
    wlan.config(ssid=config.get('wifi.ssid'), key=config.get('wifi.key'))


def initDefaultWifiAccessPoint(config):
    print("Init default Wifi")
    wlan = WLAN(WLAN.IF_AP)
    wlan.active(True)
    wlan.config(ssid='TankBuddy')

config = Config('./conf.json')

try:
    hostname(config.get('hostname'))
except Exception:
    hostname("tank-buddy")

try:
    wifiInterface = config.get('wifi.interface')
    
    print(wifiInterface)
    
    if wifiInterface == 'C':
        initWifiClient(config)            
    elif wifiInterface == 'AP':
        initWifiAccessPoint(config)
    else:
        raise Exception("Configured interface does not exists")

except Exception:
    initDefaultWifiAccessPoint(config)
