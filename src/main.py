import asyncio
from machine import Pin, SoftI2C

from api import Api
from external.microdot import Microdot
from external.vl53l0x import VL53L0X
from file_system import FileSystem
from hardware import Hardware
from mqtt import MqttPublisher
from settings import Board, Measurement, mqtt_is_usable
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

    if mqtt_is_usable():
        publisher = MqttPublisher(water_tank)
        asyncio.create_task(supervise("mqtt", publisher.run))
    else:
        print("mqtt not started (no station connection or no broker configured)")

    await api.start()


try:
    asyncio.run(main())
except Exception as error:
    print(error)
