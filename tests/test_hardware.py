import unittest
from hardware import Hardware

class DummyImpl:
    version = (1, 19, 1)
    _machine = "ESP32"

class HardwareTest(unittest.TestCase):

    def test_get_flash_statistics(self):
        def fake_statvfs(path):
            return (1024, 0, 500, 524, 0, 0, 0, 0, 0, 0)  # block size 1024, used 500, free 524
        def fake_flash_size():
            return 2 * 1024 * 1024  # 2MB

        hw = Hardware(
            statvfs_fn=fake_statvfs,
            flash_size_fn=fake_flash_size,
        )

        stats = hw.get_flash_statistics()
        self.assertEqual(stats["total"], 2048)
        self.assertEqual(stats["used"], 500)
        self.assertEqual(stats["free"], 524)

    def test_get_ram_statistics(self):
        collect_called = [False]
        def fake_collect():
            collect_called[0] = True
        def fake_mem_free():
            return 128 * 1024
        def fake_mem_alloc():
            return 64 * 1024

        hw = Hardware(
            collect_fn=fake_collect,
            mem_free_fn=fake_mem_free,
            mem_alloc_fn=fake_mem_alloc
        )

        stats = hw.get_ram_statistics()
        self.assertTrue(collect_called[0])
        self.assertEqual(stats["free"], 128)
        self.assertEqual(stats["used"], 64)
        self.assertEqual(stats["total"], 192)

    def test_get_info(self):
        hw = Hardware(
            statvfs_fn=lambda _: (1024, 0, 1, 1, 0, 0, 0, 0, 0, 0),
            flash_size_fn=lambda: 1024,
            collect_fn=lambda: None,
            mem_free_fn=lambda: 512,
            mem_alloc_fn=lambda: 512,
            implementation_obj=DummyImpl()
        )
        info = hw.get_info()
        self.assertEqual(info["micropythonVersion"], (1, 19, 1))
        self.assertEqual(info["hardware"], "ESP32")
        self.assertIn("statistics", info)

    def test_reset_invalid_kind_raises(self):
        called = []
        async def dummy_sleep(x): called.append(x)
        def dummy_task(coro): return coro  # no-op

        hw = Hardware(sleep_fn=dummy_sleep, create_task_fn=dummy_task)

        try:
            import uasyncio
            uasyncio.run(hw._reset("invalid", 1))
            self.fail("Expected exception for invalid reset kind")
        except Exception as e:
            self.assertEqual(str(e), "Kind of reset does not exist")