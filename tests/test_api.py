import unittest

from external.microdot import Microdot, TestClient
from api import Api

class DummyConfig:
    def __init__(self):
        self.data = {"foo": "bar"}

    def toJson(self):
        return self.data

    def apply(self, json_data):
        if "invalid" in json_data:
            raise ValueError("Invalid config")
        self.data.update(json_data)

class DummyHardware:
    def get_info(self):
        return {"hw": "ok"}

    def reset(self, mode, delay):
        self.last_reset = (mode, delay)

class DummyWaterTank:
    def get_statistics(self):
        return {"tank": 75}

class DummyFileSystem:
    def file_exists(self, path):
        return path.endswith(".gz")

    def get_extension(self, path):
        if "." in path:
            return "." + path.split(".")[-1]
        return ""

class TestApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = Microdot()
        cls.config = DummyConfig()
        cls.hardware = DummyHardware()
        cls.tank = DummyWaterTank()
        cls.fs = DummyFileSystem()

        cls.api = Api(
            config=cls.config, # type: ignore
            http_app=cls.app,
            file_system=cls.fs, # type: ignore
            hardware=cls.hardware, # type: ignore
            water_tank=cls.tank # type: ignore
        )

        cls.client = TestClient(cls.app)

    async def test_get_config(self):
        res = await self.client.get("/api/configs/default")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, {"foo": "bar"})

    async def test_patch_config_success(self):
        res = await self.client.patch("/api/configs/default", body={"foo": "baz"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, {"foo": "baz"})

    async def test_patch_config_fail(self):
        res = await self.client.patch("/api/configs/default", body={"invalid": True})
        self.assertEqual(res.status_code, 400)
        self.assertIsNotNone(res.json)
        self.assertIn("success", res.json)
        self.assertFalse(res.json["success"]) # type: ignore

    async def test_get_hardware_info(self):
        res = await self.client.get("/api")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, {"hw": "ok"})

    async def test_get_tank_statistics(self):
        res = await self.client.get("/api/water-tanks/default")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, {"tank": 75})

    async def test_static_file_found(self):
        res = await self.client.get("/style.css")
        self.assertEqual(res.status_code, 200)

    async def test_static_file_not_found(self):
        res = await self.client.get("/missing.css")
        self.assertEqual(res.status_code, 404)

    async def test_index_root(self):
        res = await self.client.get("/")
        self.assertEqual(res.status_code, 200)

    async def test_index_with_path(self):
        res = await self.client.get("/dashboard")
        self.assertEqual(res.status_code, 200)

    async def test_index_with_api_path(self):
        res = await self.client.get("/api/hidden")
        self.assertEqual(res.status_code, 404)
