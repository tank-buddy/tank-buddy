import pytest

import settings
from main import wifi_step
from settings import Mqtt, Runtime, Wifi


class FakeWlan:
    """Records what the reconnect loop asked of it."""

    def __init__(self, connected: bool = False, active: bool = False) -> None:
        self.connected = connected
        self._active = active
        self.connect_calls: "list[tuple[str, str | None]]" = []
        self.active_calls: "list[bool]" = []

    def isconnected(self) -> bool:
        return self.connected

    def active(self, state: "bool | None" = None) -> bool:
        if state is not None:
            self.active_calls.append(state)
            self._active = state

        return self._active

    def connect(self, ssid: str, key: "str | None") -> None:
        self.connect_calls.append((ssid, key))

    def ifconfig(self) -> "tuple[str, str, str, str]":
        return ("192.168.1.50", "255.255.255.0", "192.168.1.1", "192.168.1.1")


@pytest.fixture(autouse=True)
def _restore() -> "object":
    snapshot = (Runtime.wifi_connected, Wifi.ssid, Wifi.key, Mqtt.enabled, Mqtt.host)
    yield
    (Runtime.wifi_connected, Wifi.ssid, Wifi.key, Mqtt.enabled, Mqtt.host) = snapshot


def test_a_disconnected_station_is_retried() -> None:
    # The whole point: boot.py gave up after ten seconds, and the router is
    # still coming up. Without this the device waits for a human.
    Wifi.ssid = "Caravan"
    Wifi.key = "hunter2hunter2"
    station = FakeWlan(connected=False)

    allowed = wifi_step(station, FakeWlan())  # type: ignore[arg-type]

    assert allowed is False
    assert station.connect_calls == [("Caravan", "hunter2hunter2")]
    assert station.active_calls == [True]
    assert Runtime.wifi_connected is False


def test_the_open_access_point_is_taken_down_once_connected() -> None:
    # The recovery access point is open. Leaving it up for the life of the
    # device is a worse trade than the few minutes it is actually needed.
    Runtime.wifi_connected = False
    access_point = FakeWlan(active=True)

    wifi_step(FakeWlan(connected=True), access_point)  # type: ignore[arg-type]

    assert access_point.active_calls == [False]
    assert Runtime.wifi_connected is True


def test_an_established_connection_is_left_alone() -> None:
    Runtime.wifi_connected = True
    station = FakeWlan(connected=True)
    access_point = FakeWlan(active=False)

    wifi_step(station, access_point)  # type: ignore[arg-type]

    assert station.connect_calls == []
    assert access_point.active_calls == []


def test_mqtt_is_allowed_only_once_the_station_is_up() -> None:
    Mqtt.enabled = True
    Mqtt.host = "broker.lan"
    Runtime.wifi_connected = False

    while_down = wifi_step(FakeWlan(connected=False), FakeWlan())  # type: ignore[arg-type]
    once_up = wifi_step(FakeWlan(connected=True), FakeWlan())  # type: ignore[arg-type]

    assert while_down is False
    assert once_up is True


def test_mqtt_stays_off_without_a_broker() -> None:
    # Unchanged behaviour, restated here because the decision moved into this
    # loop: a configured-but-brokerless device must not start a retrying client.
    Mqtt.enabled = True
    Mqtt.host = ""
    Runtime.wifi_connected = False

    allowed = wifi_step(FakeWlan(connected=True), FakeWlan())  # type: ignore[arg-type]

    assert allowed is False


def test_a_connection_lost_later_is_noticed() -> None:
    # Runtime.wifi_connected is what mqtt_is_usable() reads, so leaving it true
    # after the network went away would keep a dead client alive.
    Runtime.wifi_connected = True

    wifi_step(FakeWlan(connected=False), FakeWlan())  # type: ignore[arg-type]

    assert Runtime.wifi_connected is False
    assert settings.mqtt_is_usable() is False
