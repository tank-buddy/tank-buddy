import json
import pathlib

import pytest

import settings
from settings import Mqtt, SettingsError, Tank, Wifi, WifiMode


@pytest.fixture(autouse=True)
def _restore_defaults() -> "object":
    """Settings are module-level state; snapshot and restore around each test."""
    snapshot = {
        path: getattr(field.namespace, field.attribute)
        for path, field in settings.MUTABLE_FIELDS.items()
    }
    yield
    for path, value in snapshot.items():
        field = settings.MUTABLE_FIELDS[path]
        setattr(field.namespace, field.attribute, value)


@pytest.fixture
def overlay(tmp_path: pathlib.Path) -> str:
    return str(tmp_path / "settings.json")


def test_defaults_are_the_recovery_access_point() -> None:
    assert Wifi.mode == WifiMode.ACCESS_POINT
    assert Wifi.ssid == "TankBuddy"
    assert Mqtt.enabled is False


def test_flatten_produces_dot_paths() -> None:
    assert settings.flatten({"wifi": {"ssid": "a", "key": "b"}, "tank": {"height": 1}}) == {
        "wifi.ssid": "a",
        "wifi.key": "b",
        "tank.height": 1,
    }


def test_flatten_of_empty_dict() -> None:
    assert settings.flatten({}) == {}


def test_apply_persists_and_activates(overlay: str) -> None:
    reboot_required = settings.apply({"tank": {"height": 500}}, overlay)

    assert Tank.height == 500
    assert reboot_required is False, "tank geometry is read per measurement, so it is hot"
    assert json.loads(pathlib.Path(overlay).read_text()) == {"tank": {"height": 500}}


def test_apply_reports_reboot_for_connection_settings(overlay: str) -> None:
    assert settings.apply({"wifi": {"ssid": "NewNet"}}, overlay) is True
    assert settings.apply({"mqtt": {"host": "10.0.0.5"}}, overlay) is True


def test_apply_merges_into_an_existing_overlay(overlay: str) -> None:
    settings.apply({"wifi": {"ssid": "NewNet"}}, overlay)
    settings.apply({"tank": {"height": 400}}, overlay)

    assert json.loads(pathlib.Path(overlay).read_text()) == {
        "wifi": {"ssid": "NewNet"},
        "tank": {"height": 400},
    }


def test_apply_rejects_unknown_keys(overlay: str) -> None:
    with pytest.raises(SettingsError, match="Unknown setting: wifi.channel"):
        settings.apply({"wifi": {"channel": 6}}, overlay)


def test_apply_rejects_readonly_fields(overlay: str) -> None:
    # Pin assignments and the HTTP port are deliberately not runtime-changeable.
    with pytest.raises(SettingsError, match="Unknown setting"):
        settings.apply({"http": {"port": 8080}}, overlay)


@pytest.mark.parametrize(
    "patch",
    [
        {"wifi": {"mode": "X"}},
        {"wifi": {"ssid": ""}},
        {"wifi": {"key": "short"}},
        {"mqtt": {"port": 0}},
        {"mqtt": {"port": 70000}},
        {"tank": {"height": 0}},
        {"tank": {"min_distance": -1}},
        {"mqtt": {"topic_prefix": ""}},
        {"mqtt": {"topic_prefix": "/leading"}},
        {"mqtt": {"topic_prefix": "trailing/"}},
        {"mqtt": {"discovery_prefix": ""}},
    ],
)
def test_apply_rejects_out_of_range_values(patch: "dict[str, object]", overlay: str) -> None:
    with pytest.raises(SettingsError):
        settings.apply(patch, overlay)


def test_apply_rejects_wrong_types(overlay: str) -> None:
    with pytest.raises(SettingsError, match="wrong type"):
        settings.apply({"tank": {"height": "tall"}}, overlay)


def test_apply_rejects_bool_for_an_int_field(overlay: str) -> None:
    # bool subclasses int in Python; the check must not let True through as 1.
    with pytest.raises(SettingsError, match="must be a number"):
        settings.apply({"tank": {"height": True}}, overlay)


def test_a_rejected_patch_changes_nothing(overlay: str) -> None:
    original_height = Tank.height

    with pytest.raises(SettingsError):
        settings.apply({"tank": {"height": 500}, "wifi": {"mode": "nonsense"}}, overlay)

    assert Tank.height == original_height, "validation must run before anything is applied"
    assert not pathlib.Path(overlay).exists()


def test_wifi_key_may_be_empty_for_an_open_network(overlay: str) -> None:
    settings.apply({"wifi": {"key": ""}}, overlay)

    assert Wifi.key == ""


def test_load_overlay_layers_over_defaults(overlay: str) -> None:
    pathlib.Path(overlay).write_text(json.dumps({"tank": {"height": 999}}))

    settings.load_overlay(overlay)

    assert Tank.height == 999


def test_load_overlay_without_a_file_keeps_defaults(overlay: str) -> None:
    settings.load_overlay(overlay)

    assert Tank.height == 280


def test_load_overlay_survives_a_corrupt_file(overlay: str) -> None:
    pathlib.Path(overlay).write_text("{not json at all")

    settings.load_overlay(overlay)

    assert Tank.height == 280, "a corrupt overlay must not brick the device"


def test_load_overlay_skips_invalid_entries_but_keeps_valid_ones(overlay: str) -> None:
    pathlib.Path(overlay).write_text(
        json.dumps({"tank": {"height": -5, "min_distance": 40}, "wifi": {"gone": "stale"}})
    )

    settings.load_overlay(overlay)

    assert Tank.height == 280, "an out-of-range stored value falls back to the default"
    assert Tank.min_distance == 40


@pytest.fixture
def _offline() -> "object":
    original = settings.Runtime.wifi_connected
    settings.Runtime.wifi_connected = False
    yield
    settings.Runtime.wifi_connected = original


@pytest.mark.usefixtures("_offline")
@pytest.mark.parametrize(
    ("connected", "enabled", "host", "expected"),
    [
        (True, True, "10.0.0.5", True),
        (False, True, "10.0.0.5", False),  # recovery AP: no broker reachable
        (True, False, "10.0.0.5", False),  # switched off by the user
        (True, True, "", False),  # enabled but never configured
        (False, False, "", False),
    ],
)
def test_mqtt_only_starts_with_a_station_connection_and_a_broker(
    connected: bool, enabled: bool, host: str, expected: bool
) -> None:
    settings.Runtime.wifi_connected = connected
    Mqtt.enabled = enabled
    Mqtt.host = host

    assert settings.mqtt_is_usable() is expected


def test_to_dict_exposes_every_mutable_field() -> None:
    exposed = settings.to_dict()

    flattened = settings.flatten(exposed)
    assert set(flattened) == set(settings.MUTABLE_FIELDS)
    assert exposed["tank"]["height"] == Tank.height
