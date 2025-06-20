from config import Config
from external.vl53l0x import VL53L0X

class WaterTank:
    def __init__(self, config: Config, tof: VL53L0X):
        self.config = config
        self.tof = tof

    def get_statistics(self):
        height = self.config.get("waterTank.height")
        min_distance = self.config.get("waterTank.minDistance")
        measured_distance_to_water = self.tof.range
        distance_to_water = measured_distance_to_water - min_distance # type: ignore

        if distance_to_water < 0:
            distance_to_water = 0
        
        
        return {
            "height": height,
            "minDistance": min_distance,
            "measuredDistanceToWater": measured_distance_to_water,
            "distanceToWater": distance_to_water
        }