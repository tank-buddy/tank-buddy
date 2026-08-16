import asyncio

import pytest

import settings
from settings import Tank
from water_tank import WaterTank

TANK_HEIGHT = 1000
MIN_DISTANCE = 50


@pytest.fixture(autouse=True)
def _tank_geometry() -> "object":
    original = (Tank.height, Tank.min_distance)
    Tank.height, Tank.min_distance = TANK_HEIGHT, MIN_DISTANCE
    yield
    Tank.height, Tank.min_distance = original


class DummyToF:
    """Mimics the driver's non-blocking API.

    `ready_after` is how many `reading_available()` polls it takes before a
    measurement completes, so tests can prove `sample()` actually yields
    instead of busy-waiting.
    """

    def __init__(self, *readings: int, ready_after: int = 0) -> None:
        self._readings = list(readings)
        self._ready_after = ready_after
        self._polls = 0
        self.started = 0

    def start_range_request(self) -> None:
        self.started += 1
        self._polls = 0

    def reading_available(self) -> bool:
        ready = self._polls >= self._ready_after
        self._polls += 1
        return ready

    def get_range_value(self) -> int:
        if len(self._readings) > 1:
            return self._readings.pop(0)
        return self._readings[0]


async def _sampled(*readings: int) -> WaterTank:
    tank = WaterTank(DummyToF(*readings))
    for _ in readings:
        await tank.sample()
    return tank


async def test_reports_nothing_before_the_first_sample() -> None:
    tank = WaterTank(DummyToF(300))

    statistics = tank.get_statistics()

    assert tank.has_reading() is False
    assert statistics["level"] is None
    assert statistics["distance_to_water"] is None
    assert statistics["height"] == TANK_HEIGHT, "geometry is known even without a reading"


async def test_reports_geometry_and_distance_after_sampling() -> None:
    tank = await _sampled(300)

    statistics = tank.get_statistics()

    assert statistics["height"] == TANK_HEIGHT
    assert statistics["min_distance"] == MIN_DISTANCE
    assert statistics["measured_distance"] == 300
    assert statistics["distance_to_water"] == 250


async def test_get_statistics_does_not_touch_the_sensor() -> None:
    tank = await _sampled(300)

    for _ in range(10):
        tank.get_statistics()

    # A second sample would have advanced DummyToF had get_statistics read it.
    assert tank.get_statistics()["measured_distance"] == 300


async def test_distance_is_clamped_to_zero_when_water_is_above_min_distance() -> None:
    statistics = (await _sampled(40)).get_statistics()

    assert statistics["distance_to_water"] == 0, "a negative distance is not physical"
    assert statistics["level"] == 100


async def test_median_smooths_a_single_outlier() -> None:
    statistics = (await _sampled(300, 300, 900, 300, 300)).get_statistics()

    assert statistics["measured_distance"] == 300


async def test_buffer_only_keeps_the_most_recent_readings() -> None:
    # buffer_size is 5, so the leading outlier must age out.
    statistics = (await _sampled(100, 400, 400, 400, 400, 400)).get_statistics()

    assert statistics["measured_distance"] == 400


@pytest.mark.parametrize(
    ("measured", "expected_level"),
    [
        (50, 100),  # water right at the minimum distance -> full
        (1050, 0),  # water at the tank floor -> empty
        (550, 50),  # halfway
        (2000, 0),  # below the floor is still just empty, never negative
    ],
)
async def test_level_is_computed_on_device(measured: int, expected_level: int) -> None:
    assert (await _sampled(measured)).get_statistics()["level"] == expected_level


async def test_level_survives_a_zero_height_configuration() -> None:
    Tank.height = 0

    assert (await _sampled(300)).get_statistics()["level"] == 0, "must not divide by zero"


async def test_geometry_changes_take_effect_without_a_restart() -> None:
    tank = await _sampled(300)
    assert tank.get_statistics()["distance_to_water"] == 250

    Tank.min_distance = 100

    assert tank.get_statistics()["distance_to_water"] == 200


async def test_buffer_size_defaults_to_the_configured_measurement_window() -> None:
    assert WaterTank(DummyToF(1))._buffer_size == settings.Measurement.buffer_size


async def test_sample_uses_the_non_blocking_driver_api() -> None:
    tof = DummyToF(300)

    await WaterTank(tof).sample()

    # `tof.range` would have busy-waited with utime.sleep_ms, freezing the whole
    # asyncio loop -- web server and MQTT keepalive included.
    assert tof.started == 1, "the measurement must be started explicitly"


async def test_sample_yields_while_the_sensor_is_busy() -> None:
    # The sensor needs several polls before the reading is ready; the loop must
    # stay free during that window.
    tof = DummyToF(300, ready_after=3)
    other_ran = 0

    async def competing_work() -> None:
        nonlocal other_ran
        for _ in range(3):
            other_ran += 1
            await asyncio.sleep(0)

    await asyncio.gather(WaterTank(tof).sample(), competing_work())

    assert other_ran == 3, "a concurrent task must make progress during a measurement"
