import pytest

from hardware import Hardware

try:
    from typing import Any
except ImportError:  # pragma: no cover
    pass

KIB = 1024
MIB = 1024 * KIB


class DummyImplementation:
    version = (1, 19, 1)
    _machine = "ESP32"


def test_get_flash_statistics() -> None:
    # statvfs layout: (block_size, frag_size, blocks, blocks_free, ...)
    def fake_statvfs(_path: str) -> "tuple[int, ...]":
        return (KIB, 0, 500, 524, 0, 0, 0, 0, 0, 0)

    hardware = Hardware(statvfs_fn=fake_statvfs, flash_size_fn=lambda: 2 * MIB)

    statistics = hardware.get_flash_statistics()

    assert statistics["total"] == 2048
    assert statistics["used"] == 500
    assert statistics["free"] == 524


def test_get_ram_statistics_collects_first() -> None:
    collect_calls: "list[bool]" = []

    hardware = Hardware(
        collect_fn=lambda: collect_calls.append(True),
        mem_free_fn=lambda: 128 * KIB,
        mem_alloc_fn=lambda: 64 * KIB,
    )

    statistics = hardware.get_ram_statistics()

    assert collect_calls == [True], "gc.collect() must run before reading the heap"
    assert statistics["free"] == 128
    assert statistics["used"] == 64
    assert statistics["total"] == 192


def test_get_info() -> None:
    hardware = Hardware(
        statvfs_fn=lambda _: (KIB, 0, 1, 1, 0, 0, 0, 0, 0, 0),
        flash_size_fn=lambda: KIB,
        collect_fn=lambda: None,
        mem_free_fn=lambda: 512,
        mem_alloc_fn=lambda: 512,
        implementation_obj=DummyImplementation(),
    )

    info = hardware.get_info()

    assert info["micropythonVersion"] == (1, 19, 1)
    assert info["hardware"] == "ESP32"
    assert "statistics" in info


def _capturing_hardware(
    performed: "list[str]", slept: "list[float]", scheduled: "list[Any]"
) -> Hardware:
    """A Hardware whose reset path is fully observable.

    `create_task_fn` captures the coroutine instead of scheduling it, so tests
    drive `reset()` -- the public entry point -- and await the work themselves.
    """

    async def fake_sleep(delay: float) -> None:
        slept.append(delay)

    return Hardware(
        sleep_fn=fake_sleep,
        soft_reset_fn=lambda: performed.append("soft"),
        hard_reset_fn=lambda: performed.append("hard"),
        create_task_fn=scheduled.append,
    )


@pytest.mark.parametrize(
    ("kind", "expected"),
    [("soft", "soft"), ("hard", "hard")],
)
async def test_reset_dispatches_to_the_right_call(kind: str, expected: str) -> None:
    performed: "list[str]" = []
    slept: "list[float]" = []
    scheduled: "list[Any]" = []
    hardware = _capturing_hardware(performed, slept, scheduled)

    hardware.reset(kind, 5)

    assert performed == [], "reset must be scheduled, not performed inline"
    assert len(scheduled) == 1

    await scheduled[0]

    assert performed == [expected]
    assert slept == [5], "the delay must elapse before resetting so the response can be sent"


async def test_reset_invalid_kind_raises() -> None:
    scheduled: "list[Any]" = []
    hardware = _capturing_hardware([], [], scheduled)

    hardware.reset("invalid", 1)

    with pytest.raises(ValueError, match="Kind of reset does not exist"):
        await scheduled[0]
