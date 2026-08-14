import asyncio

from settings import Measurement, Tank

try:
    from typing import Any
except ImportError:  # pragma: no cover
    pass

PERCENT = 100
LEVEL_MIN = 0
LEVEL_MAX = 100

# How long to wait between polls of the sensor's interrupt status while a
# measurement is in flight. Matches the driver's own blocking loop.
# `sleep` rather than MicroPython's `sleep_ms`, so the tests can run on CPython.
_POLL_INTERVAL_S = 0.005


class WaterTank:
    """Median-smoothed water level derived from a time-of-flight sensor.

    Sampling and reading are deliberately separate. `sample()` is the only
    method that touches the sensor and is driven by a single measurement task;
    `get_statistics()` is a pure read of the buffer. That keeps sensor I/O off
    the HTTP request path and lets the API and the MQTT publisher observe
    exactly the same value.

    `sample()` uses the driver's non-blocking API rather than its `range`
    property. That property busy-waits with `utime.sleep_ms`, which does not
    yield -- it froze the whole asyncio loop, web server and MQTT keepalive
    included, for the duration of every measurement.
    """

    # `tof` is duck-typed on a single `.range` property rather than bound to
    # VL53L0X, so tests can drive it with a scripted sequence of readings.
    def __init__(
        self,
        tof: "Any",  # noqa: ANN401
        buffer_size: int = Measurement.buffer_size,
    ) -> None:
        self._tof = tof
        self._buffer_size = buffer_size
        # A plain list rather than a deque: at five entries the cost is
        # irrelevant and it avoids relying on deque iteration support.
        self._readings: "list[int]" = []

    async def sample(self) -> int:
        """Take one reading, yielding to the loop while the sensor works."""
        self._tof.start_range_request()

        while not self._tof.reading_available():
            await asyncio.sleep(_POLL_INTERVAL_S)

        reading = self._tof.get_range_value()
        self._readings.append(reading)

        if len(self._readings) > self._buffer_size:
            self._readings.pop(0)

        return reading

    def has_reading(self) -> bool:
        return len(self._readings) > 0

    def get_statistics(self) -> "dict[str, Any]":
        """The cached level. Returns `None` values until the first sample."""
        height = Tank.height
        min_distance = Tank.min_distance

        if not self._readings:
            return {
                "height": height,
                "min_distance": min_distance,
                "measured_distance": None,
                "distance_to_water": None,
                "level": None,
            }

        measured_distance = self._median()
        distance_to_water = measured_distance - min_distance

        distance_to_water = max(distance_to_water, 0)

        return {
            "height": height,
            "min_distance": min_distance,
            "measured_distance": measured_distance,
            "distance_to_water": distance_to_water,
            "level": self._level(height, distance_to_water),
        }

    def _level(self, height: int, distance_to_water: float) -> int:
        """Fill percentage, computed on device so HA and the web UI agree."""
        if height <= 0:
            return LEVEL_MIN

        level = int((height - distance_to_water) * PERCENT // height)

        if level < LEVEL_MIN:
            return LEVEL_MIN
        if level > LEVEL_MAX:
            return LEVEL_MAX

        return level

    def _median(self) -> float:
        ordered = sorted(self._readings)
        count = len(ordered)
        middle = count // 2

        if count % 2 == 0:
            return (ordered[middle - 1] + ordered[middle]) / 2

        return ordered[middle]
