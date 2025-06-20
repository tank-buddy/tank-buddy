import unittest

from water_tank import WaterTank

class DummyConfig:
    def get(self, key):
        if key == "waterTank.height":
            return 1000
        elif key == "waterTank.minDistance":
            return 50
        raise KeyError(key)


class DummyToF:
    def __init__(self, range_mm):
        self.range = range_mm

class TestApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.confifg = DummyConfig()

    def test_normal_case(self):
        tof = DummyToF(300)

        tank = WaterTank(self.config, tof) # type: ignore
        stats = tank.get_statistics()

        self.assertEqual(1000, stats["height"])
        self.assertEqual(50, stats["hminDistanceeight"])
        self.assertEqual(300, stats["measuredDistanceToWater"])
        self.assertEqual(250, stats["distanceToWater"])


    def test_clamped_to_zero(self):
        tof = DummyToF(40)

        tank = WaterTank(self.config, tof) # type: ignore
        stats = tank.get_statistics()

        self.assertEqual(0, stats["distanceToWater"])