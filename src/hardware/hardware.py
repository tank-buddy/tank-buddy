from asyncio import create_task, sleep
from esp import flash_size
from gc import collect, mem_alloc, mem_free
from machine import reset, soft_reset
from os import statvfs
from sys import implementation

try:
    # Type-checking only. MicroPython has no `typing` module, but it also
    # discards annotations at compile time, so they are never evaluated on
    # device and cost no RAM. See CLAUDE.md.
    from typing import Any, Callable
except ImportError:
    pass

BYTES_PER_KIB = 1024

RESET_KIND_SOFT = "soft"
RESET_KIND_HARD = "hard"


class Hardware:
    """Flash/RAM statistics and resets.

    Every platform call is a constructor default argument so tests can
    substitute fakes; keep that property when adding hardware access.
    """

    def __init__(  # noqa: PLR0913, PLR0917 - one parameter per injected platform call
        self,
        statvfs_fn: "Callable[[str], tuple[int, ...]]" = statvfs,
        flash_size_fn: "Callable[[], int]" = flash_size,
        mem_free_fn: "Callable[[], int]" = mem_free,
        mem_alloc_fn: "Callable[[], int]" = mem_alloc,
        # `object`, not `None`: gc.collect() is typed as returning `int | None`
        # (CPython hands back a count, MicroPython does not), and this code never
        # looks at the result either way.
        collect_fn: "Callable[[], object]" = collect,
        # `sys.implementation` is a platform object with no usable stub type.
        implementation_obj: "Any" = implementation,  # noqa: ANN401
        hard_reset_fn: "Callable[[], None]" = reset,
        soft_reset_fn: "Callable[[], None]" = soft_reset,
        sleep_fn: "Callable[[float], Any]" = sleep,
        create_task_fn: "Callable[[Any], Any]" = create_task,
    ) -> None:
        self._statvfs = statvfs_fn
        self._flash_size = flash_size_fn
        self._mem_free = mem_free_fn
        self._mem_alloc = mem_alloc_fn
        self._collect = collect_fn
        self._impl = implementation_obj
        self._hard_reset = hard_reset_fn
        self._soft_reset = soft_reset_fn
        self._sleep = sleep_fn
        self._create_task = create_task_fn

    def get_flash_statistics(self) -> "dict[str, int]":
        fs_status = self._statvfs("/")

        total = self._flash_size() // BYTES_PER_KIB
        used = (fs_status[0] * fs_status[2]) // BYTES_PER_KIB
        free = (fs_status[0] * fs_status[3]) // BYTES_PER_KIB

        return {
            "used": used,
            "free": free,
            "total": total,
        }

    def get_ram_statistics(self) -> "dict[str, int]":
        self._collect()
        free = self._mem_free() // BYTES_PER_KIB
        used = self._mem_alloc() // BYTES_PER_KIB
        total = free + used

        return {
            "used": used,
            "free": free,
            "total": total,
        }

    def get_statistics(self) -> "dict[str, dict[str, int]]":
        return {
            "ram": self.get_ram_statistics(),
            "flash": self.get_flash_statistics(),
        }

    def get_info(self) -> "dict[str, Any]":
        return {
            "micropythonVersion": self._impl.version,
            "hardware": self._impl._machine,
            "statistics": self.get_statistics(),
        }

    async def _reset(self, kind: str, delay: int) -> None:
        if kind not in (RESET_KIND_SOFT, RESET_KIND_HARD):
            raise ValueError("Kind of reset does not exist")

        await self._sleep(delay)

        if kind == RESET_KIND_SOFT:
            self._soft_reset()
            return

        self._hard_reset()

    def reset(self, kind: str, delay: int) -> None:
        """Schedule a reset as a task so the caller can still send a response."""
        self._create_task(self._reset(kind, delay))
