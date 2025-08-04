from config import Config
from external.vl53l0x import VL53L0X
from collections import deque

DISTANCE_BUFFER_SIZE = 5


class WaterTank:
    def __init__(self, config: Config, tof: VL53L0X):
        self.config = config
        self.tof = tof
        self.distance_buffer = deque((), DISTANCE_BUFFER_SIZE)

    def get_statistics(self):
        height = self.config.get("waterTank.height")
        min_distance = self.config.get("waterTank.minDistance")
        measured_distance = self.tof.range
        self.distance_buffer.append(measured_distance)
        median_distance = self._median(self.distance_buffer)

        distance = median_distance - min_distance  # type: ignore

        if distance < 0:
            distance = 0

        return {
            "height": height,
            "minDistance": min_distance,
            "measuredDistanceToWater": median_distance,
            "distanceToWater": distance,
        }

    def _median(self, data):
        data = sorted(data)
        n = len(data)
        mid = n // 2
        if n % 2 == 0:
            return (data[mid - 1] + data[mid]) / 2
        else:
            return data[mid]
