"""Make MicroPython-only modules importable under CPython.

The firmware imports `esp`, `machine`, `micropython` and `network` at module
level. None of them exist on CPython, so they are faked into `sys.modules`
here -- before pytest imports any test module, and therefore before any
`src/` module is imported.

These fakes only exist so the imports resolve. Behaviour is injected per test
through the constructor-default pattern used by `Hardware`, `FileSystem` and
`WaterTank`; do not grow this file into a device emulator.
"""

import builtins
import gc
import sys
import types

try:
    from typing import Any
except ImportError:  # pragma: no cover - CPython always has typing
    pass


def _install(name: str, **attributes: "Any") -> types.ModuleType:
    """Register a fake module under `name`, replacing any earlier fake."""
    module = types.ModuleType(name)
    for attribute, value in attributes.items():
        setattr(module, attribute, value)
    sys.modules[name] = module
    return module


class _Pin:
    """Stand-in for `machine.Pin`; records the pin number only."""

    IN = 0
    OUT = 1

    def __init__(self, number: int, mode: int = 0) -> None:
        self.number = number
        self.mode = mode


class _SoftI2C:
    """Stand-in for `machine.SoftI2C`; performs no bus traffic."""

    def __init__(self, scl: "_Pin | None" = None, sda: "_Pin | None" = None) -> None:
        self.scl = scl
        self.sda = sda

    def readfrom_mem(self, *_args: "Any", **_kwargs: "Any") -> bytes:
        return b"\x00"

    def writeto_mem(self, *_args: "Any", **_kwargs: "Any") -> None:
        return None


class _WLAN:
    """Stand-in for `network.WLAN`; reports a disconnected station."""

    IF_STA = 0
    IF_AP = 1

    def __init__(self, interface: int = 0) -> None:
        self.interface = interface
        self._active = False
        self._connected = False

    def active(self, state: "bool | None" = None) -> bool:
        if state is not None:
            self._active = state
        return self._active

    def isconnected(self) -> bool:
        return self._connected

    def connect(self, *_args: "Any", **_kwargs: "Any") -> None:
        return None

    def disconnect(self) -> None:
        return None

    def scan(self) -> "list[Any]":
        return []

    def config(self, *_args: "Any", **_kwargs: "Any") -> "Any":
        return None

    def ifconfig(self, *_args: "Any", **_kwargs: "Any") -> "Any":
        return ("0.0.0.0", "0.0.0.0", "0.0.0.0", "0.0.0.0")

    def status(self, *_args: "Any", **_kwargs: "Any") -> int:
        return 0


def _identity(value: "Any") -> "Any":
    """`micropython.const()` is a compile-time hint; at runtime it is identity."""
    return value


# `gc.collect()` exists on CPython; the heap accessors are MicroPython-only, so
# they are added to the real module rather than replacing it wholesale.
if not hasattr(gc, "mem_free"):
    gc.mem_free = lambda: 128 * 1024  # type: ignore[attr-defined]
if not hasattr(gc, "mem_alloc"):
    gc.mem_alloc = lambda: 64 * 1024  # type: ignore[attr-defined]

# MicroPython still exposes several stdlib modules under a `u` prefix, which
# the vendored drivers in src/external/ use. Alias them onto the real modules.
for _canonical, _alias in (
    ("time", "utime"),
    ("struct", "ustruct"),
    ("binascii", "ubinascii"),
    ("json", "ujson"),
    ("os", "uos"),
    ("socket", "usocket"),
    ("asyncio", "uasyncio"),
):
    if _alias not in sys.modules:
        sys.modules[_alias] = __import__(_canonical)

_install("esp", flash_size=lambda: 2 * 1024 * 1024)

_install(
    "machine",
    Pin=_Pin,
    SoftI2C=_SoftI2C,
    reset=lambda: None,
    soft_reset=lambda: None,
    unique_id=lambda: b"\xde\xad\xbe\xef\x00\x01",
)

_install("micropython", const=_identity)

# The vendored VL53L0X driver calls `const()` without importing it, relying on
# MicroPython exposing it as a builtin. src/external/ is upstream code we do not
# modify, so provide the builtin instead.
if not hasattr(builtins, "const"):
    builtins.const = _identity  # type: ignore[attr-defined]


def _hostname(*_args: "Any") -> str:
    return "tank-buddy"


_install("network", WLAN=_WLAN, hostname=_hostname)
