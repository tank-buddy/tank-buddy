import json

import pytest

import settings
from mqtt import ENTITIES, MqttPublisher
from mqtt.mqtt import PAYLOAD_OFFLINE, PAYLOAD_ONLINE
from settings import Mqtt

DEVICE_ID = "deadbeef0001"


class DummyWaterTank:
    def __init__(self, level: "int | None" = 62, distance: "int | None" = 105) -> None:
        self._level = level
        self._distance = distance

    def get_statistics(self) -> "dict[str, object]":
        return {
            "level": self._level,
            "distance_to_water": self._distance,
            "height": 280,
            "min_distance": 30,
        }


class DummyEvent:
    def __init__(self) -> None:
        self.cleared = 0

    async def wait(self) -> None:
        return None

    def clear(self) -> None:
        self.cleared += 1


class DummyClient:
    """Records publishes instead of talking to a broker."""

    def __init__(self, config: "dict[str, object] | None" = None) -> None:
        self.config = config or {}
        self.up = DummyEvent()
        self.connected = False
        self.published: "list[tuple[str, str, bool, int]]" = []

    async def connect(self) -> None:
        self.connected = True

    async def publish(self, topic: str, message: str, retain: bool, qos: int) -> None:
        self.published.append((topic, message, retain, qos))

    def topics(self) -> "list[str]":
        return [topic for topic, _message, _retain, _qos in self.published]

    def payload_for(self, topic: str) -> "dict[str, object]":
        for published_topic, message, _retain, _qos in self.published:
            if published_topic == topic:
                return json.loads(message)
        raise AssertionError(f"nothing published to {topic}")


@pytest.fixture(autouse=True)
def _restore_settings() -> "object":
    snapshot = {
        path: getattr(field.namespace, field.attribute)
        for path, field in settings.MUTABLE_FIELDS.items()
    }
    yield
    for path, value in snapshot.items():
        field = settings.MUTABLE_FIELDS[path]
        setattr(field.namespace, field.attribute, value)


@pytest.fixture
def publisher() -> MqttPublisher:
    return MqttPublisher(
        DummyWaterTank(),
        client_factory=DummyClient,
        rssi_fn=lambda: -58,
        device_id_fn=lambda: DEVICE_ID,
    )


def test_topics_follow_the_configured_prefix(publisher: MqttPublisher) -> None:
    assert publisher.state_topic == "tankbuddy/state"
    assert publisher.availability_topic == "tankbuddy/status"


def test_topic_prefix_is_configurable(publisher: MqttPublisher) -> None:
    Mqtt.topic_prefix = "garden/cistern"

    assert publisher.state_topic == "garden/cistern/state"


def test_discovery_topics_are_per_entity(publisher: MqttPublisher) -> None:
    topics = [publisher.discovery_topic(entity) for entity in ENTITIES]

    assert topics == [
        f"homeassistant/sensor/{DEVICE_ID}/level/config",
        f"homeassistant/sensor/{DEVICE_ID}/distance/config",
        f"homeassistant/sensor/{DEVICE_ID}/rssi/config",
    ]


def test_state_payload_carries_all_three_values(publisher: MqttPublisher) -> None:
    assert publisher.state_payload() == {"level": 62, "distance": 105, "rssi": -58}


def test_state_payload_passes_through_a_missing_reading() -> None:
    publisher = MqttPublisher(
        DummyWaterTank(level=None, distance=None),
        client_factory=DummyClient,
        rssi_fn=lambda: None,
        device_id_fn=lambda: DEVICE_ID,
    )

    assert publisher.state_payload() == {"level": None, "distance": None, "rssi": None}


def test_every_entity_reads_from_the_shared_state_topic(publisher: MqttPublisher) -> None:
    for entity in ENTITIES:
        payload = publisher.discovery_payload(entity)

        assert payload["state_topic"] == publisher.state_topic
        assert payload["value_template"] == "{{ value_json." + entity.key + " }}"


def test_entities_share_one_device_so_home_assistant_groups_them(
    publisher: MqttPublisher,
) -> None:
    devices = [publisher.discovery_payload(entity)["device"] for entity in ENTITIES]

    assert all(device == devices[0] for device in devices)
    assert devices[0]["identifiers"] == [f"tank_buddy_{DEVICE_ID}"]


def test_unique_ids_are_stable_and_distinct(publisher: MqttPublisher) -> None:
    unique_ids = [publisher.discovery_payload(entity)["unique_id"] for entity in ENTITIES]

    assert unique_ids == [
        f"tank_buddy_{DEVICE_ID}_level",
        f"tank_buddy_{DEVICE_ID}_distance",
        f"tank_buddy_{DEVICE_ID}_rssi",
    ]
    assert len(set(unique_ids)) == len(ENTITIES)


def test_diagnostic_entities_are_categorised(publisher: MqttPublisher) -> None:
    by_key = {entity.key: publisher.discovery_payload(entity) for entity in ENTITIES}

    assert "entity_category" not in by_key["level"], "the fill level is the primary sensor"
    assert by_key["distance"]["entity_category"] == "diagnostic"
    assert by_key["rssi"]["entity_category"] == "diagnostic"
    assert by_key["distance"]["device_class"] == "distance"
    assert by_key["rssi"]["device_class"] == "signal_strength"


def test_every_entity_is_tied_to_the_availability_topic(publisher: MqttPublisher) -> None:
    # Without this HA would keep showing the last value after the device dies.
    for entity in ENTITIES:
        payload = publisher.discovery_payload(entity)

        assert payload["availability_topic"] == publisher.availability_topic
        assert payload["payload_available"] == PAYLOAD_ONLINE
        assert payload["payload_not_available"] == PAYLOAD_OFFLINE


def test_discovery_payload_is_json_serialisable(publisher: MqttPublisher) -> None:
    for entity in ENTITIES:
        assert json.loads(json.dumps(publisher.discovery_payload(entity)))


def test_client_config_sets_a_last_will(publisher: MqttPublisher) -> None:
    will = publisher.client_config()["will"]

    assert will == ("tankbuddy/status", PAYLOAD_OFFLINE, True, 1)


def test_client_config_uses_event_mode() -> None:
    # queue_len > 0 is what switches mqtt_as to the client.up/down Event API.
    assert (
        MqttPublisher(DummyWaterTank(), client_factory=DummyClient).client_config()["queue_len"] > 0
    )


def test_client_config_maps_credentials_without_none() -> None:
    Mqtt.host, Mqtt.port, Mqtt.user, Mqtt.password = "10.0.0.5", 8883, None, None

    config = MqttPublisher(DummyWaterTank(), client_factory=DummyClient).client_config()

    assert config["server"] == "10.0.0.5"
    assert config["port"] == 8883
    # mqtt_as expects strings; None would break its CONNECT packet encoding.
    assert config["user"] == ""
    assert config["password"] == ""


async def test_announce_publishes_discovery_then_availability(
    publisher: MqttPublisher,
) -> None:
    client = DummyClient()

    await publisher._announce(client)

    assert client.topics() == [
        publisher.discovery_topic(ENTITIES[0]),
        publisher.discovery_topic(ENTITIES[1]),
        publisher.discovery_topic(ENTITIES[2]),
        publisher.availability_topic,
    ]


async def test_discovery_and_availability_are_retained(publisher: MqttPublisher) -> None:
    client = DummyClient()

    await publisher._announce(client)

    assert all(retain for _topic, _message, retain, _qos in client.published)


async def test_publish_state_sends_the_json_state_payload(publisher: MqttPublisher) -> None:
    client = DummyClient()

    await publisher.publish_state(client)

    assert client.payload_for(publisher.state_topic) == {
        "level": 62,
        "distance": 105,
        "rssi": -58,
    }
