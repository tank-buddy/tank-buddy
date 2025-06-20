from os import statvfs
from esp import flash_size
from gc import collect, mem_alloc, mem_free
from sys import implementation
from machine import reset, soft_reset
from asyncio import sleep, create_task

class Hardware:
    def __init__(
        self,
        statvfs_fn=statvfs,
        flash_size_fn=flash_size,
        mem_free_fn=mem_free,
        mem_alloc_fn=mem_alloc,
        collect_fn=collect,
        implementation_obj=implementation,
        reset_fn=reset,
        soft_reset_fn=soft_reset,
        sleep_fn=sleep,
        create_task_fn=create_task,
    ):
        self._statvfs = statvfs_fn
        self._flash_size = flash_size_fn
        self._mem_free = mem_free_fn
        self._mem_alloc = mem_alloc_fn
        self._collect = collect_fn
        self._impl = implementation_obj
        self._reset = reset_fn
        self._soft_reset = soft_reset_fn
        self._sleep = sleep_fn
        self._create_task = create_task_fn
        

    def get_flash_statistics(self):
        fs_status = self._statvfs('/')
        
        total = self._flash_size() // 1024
        used = (fs_status[0] * fs_status[2]) // 1024
        free = (fs_status[0] * fs_status[3]) // 1024

        return {
            "used": used,
            "free": free,
            "total": total,
        }

    def get_ram_statistics(self):
        self._collect()
        free = self._mem_free() // 1024
        used = self._mem_alloc() // 1024
        total = free + used

        return {
            "used": used,
            "free": free,
            "total": total,
        }
    
    def get_statistics(self):
        return {
            "ram": self.get_ram_statistics(),
            "flash": self.get_flash_statistics(), 
        }
    
    def get_info(self):
        return {
            "micropythonVersion": self._impl.version,
            "hardware": self._impl._machine,
            "statistics": self.get_statistics()
        }
    
    async def _reset(self, kind, delay):
        if kind != "soft" and kind != "hard":
            raise Exception("Kind of reset does not exist")
        
        await self._sleep(delay)

        if kind == "soft":
            self._soft_reset()
            return

        reset()

    def reset(self, kind, delay):
        self._create_task(self._reset(kind, delay))