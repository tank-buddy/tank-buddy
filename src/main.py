import asyncio
from machine import Pin, SoftI2C
from network import WLAN

from api import Api
from external.microdot import Microdot
from external.vl53l0x import VL53L0X
from file_system import FileSystem
from hardware import Hardware
from mqtt import MqttPublisher
from settings import Board, Measurement, Runtime, Wifi, WifiMode, mqtt_is_usable
from water_tank import WaterTank

try:
    from typing import Any, Callable
except ImportError:  # pragma: no cover
    pass

SUPERVISOR_RESTART_DELAY_S = 5


async def supervise(name: str, coroutine_factory: "Callable[[], Any]") -> None:
    """Keep a background loop alive.

    boot.py never lets an exception escape, because an unreachable device
    cannot be reconfigured. The same reasoning applies at runtime: a crashed
    measurement or MQTT task must not take the web server down with it, and
    must not disappear silently either.
    """
    while True:
        try:
            await coroutine_factory()
        except Exception as error:
            print("task", name, "crashed:", error)

        await asyncio.sleep(SUPERVISOR_RESTART_DELAY_S)


def wifi_step(station: WLAN, access_point: WLAN) -> bool:
    """One pass of the reconnect loop; returns whether MQTT may run now.

    Deliberately pure decision-making -- no sleeping, no task creation -- so the
    behaviour that matters can be tested without a timer or a broker.

    The access point is taken down on the first successful connection rather
    than left running. It is open, and an open network that lingers for the life
    of the device is worse than one that exists only while it is needed.
    """
    if not station.isconnected():
        Runtime.wifi_connected = False
        station.active(True)

        try:
            station.connect(Wifi.ssid, Wifi.key)
        except Exception as error:
            print("wifi retry failed:", error)

        return False

    if not Runtime.wifi_connected:
        Runtime.wifi_connected = True
        print("wifi connected:", station.ifconfig()[0])

        if access_point.active():
            access_point.active(False)

    return mqtt_is_usable()


async def wifi_loop(
    water_tank: WaterTank,
    wlan_factory: "Callable[[int], Any]" = WLAN,
    sleep: "Callable[[int], Any]" = asyncio.sleep,
) -> None:
    """Join the configured network, however late it turns up.

    boot.py gives the station ten seconds and then falls back to the recovery
    access point, which is right: a device that blocks its own boot waiting for a
    router is a device nobody can reconfigure. But it used to end there. When the
    router and this device share a power switch -- a caravan, a shed, anything on
    one breaker -- the router is still booting when those ten seconds pass, and
    the device sat in its access point until someone power-cycled it by hand.

    This owns the MQTT task too, because whether MQTT makes sense is exactly the
    question this loop answers, and the answer can change long after boot.
    """
    station = wlan_factory(WLAN.IF_STA)
    access_point = wlan_factory(WLAN.IF_AP)
    publisher_started = False

    while True:
        if wifi_step(station, access_point) and not publisher_started:
            asyncio.create_task(supervise("mqtt", MqttPublisher(water_tank).run))
            publisher_started = True

        await sleep(Wifi.reconnect_interval_s)


async def measure_loop(water_tank: WaterTank) -> None:
    while True:
        await water_tank.sample()
        await asyncio.sleep(Measurement.interval_s)


async def main() -> None:
    i2c = SoftI2C(scl=Pin(Board.i2c_scl_pin), sda=Pin(Board.i2c_sda_pin))
    water_tank = WaterTank(VL53L0X(i2c))

    api = Api(
        http_app=Microdot(),
        file_system=FileSystem(),
        hardware=Hardware(),
        water_tank=water_tank,
    )

    # Prime the buffer so the first request already has a reading to report.
    await water_tank.sample()

    asyncio.create_task(supervise("measure", lambda: measure_loop(water_tank)))

    if Wifi.mode == WifiMode.CLIENT:
        asyncio.create_task(supervise("wifi", lambda: wifi_loop(water_tank)))
    else:
        # An access point has no network to join and no broker to reach.
        print("wifi loop not started (access point mode)")

    await api.start()


# MicroPython runs this file as the boot script, where __name__ is "__main__",
# so the guard changes nothing on device -- but it lets the tests import the
# module without starting the whole application.
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(error)
