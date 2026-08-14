"""Single source of truth for every configurable value.

Defaults live here as typed namespaces built on module-level `const()` values,
which the compiler inlines and which therefore cost no RAM on device.

A small subset -- everything listed in `MUTABLE_FIELDS` -- can be changed at
runtime through the API. Those changes are persisted to `OVERLAY_PATH` and
layered back over the defaults on import. The overlay lives outside `src/`
because `manifest.py` may freeze `src/` into the firmware image, which makes it
read-only.

Note which values use `const()` and which do not: `const()` is a compile-time
inlining hint, so anything the overlay may rewrite has to stay a plain class
attribute. The consts below are the true constants -- pin numbers, buffer
sizes, protocol defaults.
"""

from json import dump, load
from micropython import const

try:
    # Type-checking only; see the note in hardware.py.
    from typing import Any, Callable
except ImportError:
    pass

# The overlay is deliberately not under src/ -- that tree may be frozen.
OVERLAY_PATH = "/settings.json"

# --- Wi-Fi ------------------------------------------------------------------
_WIFI_MODE_CLIENT = const("C")
_WIFI_MODE_ACCESS_POINT = const("AP")
_WIFI_DEFAULT_MODE = _WIFI_MODE_ACCESS_POINT
_WIFI_DEFAULT_SSID = const("TankBuddy")
_WIFI_CONNECT_TIMEOUT_S = const(10)
_WIFI_HOSTNAME = const("tank-buddy")
_WIFI_AP_IP = const("192.168.1.1")
_WIFI_AP_NETMASK = const("255.255.255.0")
_WIFI_SSID_MAX_LENGTH = const(32)
_WIFI_KEY_MIN_LENGTH = const(8)
_WIFI_KEY_MAX_LENGTH = const(63)

# --- MQTT -------------------------------------------------------------------
_MQTT_DEFAULT_PORT = const(1883)
_MQTT_KEEPALIVE_S = const(60)
_MQTT_PUBLISH_INTERVAL_S = const(30)
_MQTT_TOPIC_PREFIX = const("tankbuddy")
_MQTT_DISCOVERY_PREFIX = const("homeassistant")
_PORT_MAX = const(65535)

# --- Tank geometry ----------------------------------------------------------
_TANK_HEIGHT_MM = const(280)
_TANK_MIN_DISTANCE_MM = const(30)

# --- Hardware / timing ------------------------------------------------------
_I2C_SCL_PIN = const(1)
_I2C_SDA_PIN = const(0)
_HTTP_PORT = const(80)
_MEASUREMENT_INTERVAL_S = const(5)
_DISTANCE_BUFFER_SIZE = const(5)
_RESET_DELAY_S = const(5)


class SettingsError(Exception):
    """Raised when a patch fails validation; nothing is persisted."""


class WifiMode:
    """MicroPython has no `enum`; a namespace class over consts stands in."""

    CLIENT: str = _WIFI_MODE_CLIENT
    ACCESS_POINT: str = _WIFI_MODE_ACCESS_POINT


class Wifi:
    mode: str = _WIFI_DEFAULT_MODE
    ssid: str = _WIFI_DEFAULT_SSID
    key: "str | None" = None
    hostname: str = _WIFI_HOSTNAME
    connect_timeout_s: int = _WIFI_CONNECT_TIMEOUT_S
    ap_ip: str = _WIFI_AP_IP
    ap_netmask: str = _WIFI_AP_NETMASK


class Mqtt:
    enabled: bool = False
    host: str = ""
    port: int = _MQTT_DEFAULT_PORT
    user: "str | None" = None
    password: "str | None" = None
    keepalive_s: int = _MQTT_KEEPALIVE_S
    publish_interval_s: int = _MQTT_PUBLISH_INTERVAL_S
    topic_prefix: str = _MQTT_TOPIC_PREFIX
    discovery_prefix: str = _MQTT_DISCOVERY_PREFIX


class Tank:
    """Geometry in millimetres, measured from the sensor at the top."""

    height: int = _TANK_HEIGHT_MM
    min_distance: int = _TANK_MIN_DISTANCE_MM


class Board:
    """Named `Board`, not `Hardware`, to avoid clashing with the Hardware class."""

    i2c_scl_pin: int = _I2C_SCL_PIN
    i2c_sda_pin: int = _I2C_SDA_PIN
    reset_delay_s: int = _RESET_DELAY_S


class Runtime:
    """Live state, never persisted.

    boot.py and main.py run in separate scopes, but both import this module and
    therefore share one instance of it via sys.modules -- which makes this the
    reliable way to hand the connection result from one to the other.
    """

    wifi_connected: bool = False


class Http:
    port: int = _HTTP_PORT


class Measurement:
    interval_s: int = _MEASUREMENT_INTERVAL_S
    buffer_size: int = _DISTANCE_BUFFER_SIZE


def _is_wifi_mode(value: str) -> bool:
    return value in (WifiMode.CLIENT, WifiMode.ACCESS_POINT)


def _is_ssid(value: str) -> bool:
    return 0 < len(value) <= _WIFI_SSID_MAX_LENGTH


def _is_wifi_key(value: str) -> bool:
    # An empty key means "open network"; WPA2 otherwise bounds the length.
    return len(value) == 0 or _WIFI_KEY_MIN_LENGTH <= len(value) <= _WIFI_KEY_MAX_LENGTH


def _is_port(value: int) -> bool:
    return 0 < value <= _PORT_MAX


def _is_positive(value: int) -> bool:
    return value > 0


def _is_not_negative(value: int) -> bool:
    return value >= 0


def _always_valid(_value: object) -> bool:
    return True


def _is_topic(value: str) -> bool:
    # MQTT topic levels are slash-separated; leading or trailing slashes create
    # an empty level, which is legal but almost always a typo.
    return len(value) > 0 and not value.startswith("/") and not value.endswith("/")


class _Field:
    """One runtime-changeable setting, addressed by its dot path."""

    def __init__(
        self,
        namespace: type,
        attribute: str,
        kind: type,
        validator: "Callable[[Any], bool]",
        reboot_required: bool,
    ) -> None:
        self.namespace = namespace
        self.attribute = attribute
        self.kind = kind
        self.validator = validator
        self.reboot_required = reboot_required


# The single source of truth for what the API accepts. This doubles as the
# allowlist for the overlay, so an unknown or stale key is ignored rather than
# silently resurrecting a setting that no longer exists.
MUTABLE_FIELDS: "dict[str, _Field]" = {
    "wifi.mode": _Field(Wifi, "mode", str, _is_wifi_mode, True),
    "wifi.ssid": _Field(Wifi, "ssid", str, _is_ssid, True),
    "wifi.key": _Field(Wifi, "key", str, _is_wifi_key, True),
    "mqtt.enabled": _Field(Mqtt, "enabled", bool, _always_valid, True),
    "mqtt.host": _Field(Mqtt, "host", str, _always_valid, True),
    "mqtt.port": _Field(Mqtt, "port", int, _is_port, True),
    "mqtt.user": _Field(Mqtt, "user", str, _always_valid, True),
    "mqtt.password": _Field(Mqtt, "password", str, _always_valid, True),
    "mqtt.publish_interval_s": _Field(Mqtt, "publish_interval_s", int, _is_positive, False),
    # Changing either prefix moves the topics, so the retained discovery
    # configs have to be published again -- hence reboot required.
    "mqtt.topic_prefix": _Field(Mqtt, "topic_prefix", str, _is_topic, True),
    "mqtt.discovery_prefix": _Field(Mqtt, "discovery_prefix", str, _is_topic, True),
    "tank.height": _Field(Tank, "height", int, _is_positive, False),
    "tank.min_distance": _Field(Tank, "min_distance", int, _is_not_negative, False),
}


def mqtt_is_usable() -> bool:
    """Whether starting the MQTT client makes any sense.

    In the recovery access point there is no broker to reach, and a client
    retrying forever would only consume RAM while the user is trying to fix the
    configuration. Requires a real station connection and a configured host.
    """
    return Runtime.wifi_connected and Mqtt.enabled and len(Mqtt.host) > 0


def flatten(data: "dict[str, Any]", prefix: str = "") -> "dict[str, Any]":
    """Turn a nested dict into one keyed by dot paths.

    Replaces the former `schema.KeyValueMapMapper`. Lists are treated as leaves
    rather than recursed into; no setting is list-valued.
    """
    flattened: "dict[str, Any]" = {}

    for key, value in data.items():
        path = prefix + key
        # Bound before the isinstance check so the recursive call still sees an
        # untyped structure rather than a narrowed dict[Unknown, Unknown].
        section: "Any" = value

        if isinstance(value, dict):
            flattened.update(flatten(section, path + "."))
        else:
            flattened[path] = value

    return flattened


def _validate(path: str, value: object) -> "_Field":
    field = MUTABLE_FIELDS.get(path)

    if field is None:
        raise SettingsError("Unknown setting: " + path)

    # bool is a subclass of int, so an int field must reject True/False.
    if field.kind is int and isinstance(value, bool):
        raise SettingsError("Value for " + path + " must be a number")

    if not isinstance(value, field.kind):
        raise SettingsError("Value for " + path + " has the wrong type")

    if not field.validator(value):
        raise SettingsError("Value for " + path + " is out of range")

    return field


def to_dict() -> "dict[str, dict[str, Any]]":
    """Current values of every runtime-changeable setting, nested for the API."""
    nested: "dict[str, dict[str, Any]]" = {}

    for path, field in MUTABLE_FIELDS.items():
        section, name = path.split(".")
        nested.setdefault(section, {})[name] = getattr(field.namespace, field.attribute)

    return nested


def _read_overlay(path: str) -> "dict[str, Any]":
    stored: "dict[str, Any]" = {}

    try:
        with open(path) as handle:
            parsed = load(handle)
    except (OSError, ValueError):
        # A missing, truncated or corrupt overlay must not brick the device:
        # fall back to defaults, as boot.py falls back to the recovery AP.
        return stored

    try:
        entries = parsed.items()
    except AttributeError:
        # Valid JSON, but not an object -- treat it like a corrupt overlay.
        return stored

    # Rebuilt key by key rather than returned directly: json.load hands back an
    # untyped structure, and JSON object keys are strings by definition.
    for key, value in entries:
        stored[str(key)] = value

    return stored


def _write_overlay(path: str, stored: "dict[str, Any]") -> None:
    with open(path, "w") as handle:
        dump(stored, handle)


def load_overlay(path: str = OVERLAY_PATH) -> None:
    """Layer persisted values over the defaults. Invalid entries are skipped."""
    for dotted_path, value in flatten(_read_overlay(path)).items():
        try:
            field = _validate(dotted_path, value)
        except SettingsError:
            continue
        setattr(field.namespace, field.attribute, value)


def apply(patch: "dict[str, Any]", path: str = OVERLAY_PATH) -> bool:
    """Validate, persist and activate a patch.

    Returns whether the change needs a reboot to take effect. Validation runs
    over the whole patch before anything is written, so a rejected patch leaves
    both the overlay and the live values untouched.
    """
    flattened = flatten(patch)
    fields = {dotted: _validate(dotted, value) for dotted, value in flattened.items()}

    stored = _read_overlay(path)
    for dotted, value in flattened.items():
        section, name = dotted.split(".")
        stored.setdefault(section, {})[name] = value

    _write_overlay(path, stored)

    reboot_required = False
    for dotted, value in flattened.items():
        field = fields[dotted]
        setattr(field.namespace, field.attribute, value)
        reboot_required = reboot_required or field.reboot_required

    return reboot_required
