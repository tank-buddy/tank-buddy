from machine import Pin, SoftI2C
from external.vl53l0x import VL53L0X
from external.microdot import Microdot
from config import Config
from water_tank import WaterTank
from hardware import Hardware
from file_system import FileSystem
from ssl import SSLContext, PROTOCOL_TLS_SERVER, CERT_NONE
from api import Api
from certs import private_key, certificate

config = Config("./conf.json")

i2c = SoftI2C(scl=Pin(1), sda=Pin(0))
tof = VL53L0X(i2c)
water_tank = WaterTank(config, tof)
app = Microdot()
hardware = Hardware()
file_system = FileSystem()
ssl_context = SSLContext(PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain(certificate, private_key)

api = Api(config, app, file_system, hardware, water_tank, ssl_context)
api.run()
