# mqtt_as is vendored upstream code without annotations, so its config dict and
# client surface degrade to Unknown here.
# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false
# pyright: reportUnknownArgumentType=false
import asyncio
from binascii import hexlify
from json import dumps
from machine import unique_id
from network import WLAN

from settings import Mqtt, Wifi

try:
    from typing import Any, Callable
except ImportError:
    pass

PAYLOAD_ONLINE = "online"
PAYLOAD_OFFLINE = "offline"

# Retained, so Home Assistant restores the device after its own restart.
RETAIN = True
QOS_AT_LEAST_ONCE = 1

DEVICE_NAME = "TankBuddy"
DEVICE_MODEL = "TankBuddy ESP32"
DEVICE_MANUFACTURER = "TankBuddy"
DEVICE_ID_PREFIX = "tank_buddy"

# mqtt_as switches from callback mode to the asyncio.Event API when this is > 0.
QUEUE_LENGTH = 1

ENTITY_CATEGORY_DIAGNOSTIC = "diagnostic"
STATE_CLASS_MEASUREMENT = "measurement"


class Entity:
    """One Home Assistant sensor, fed from a field of the shared state topic."""

    def __init__(  # noqa: PLR0913, PLR0917 - a flat description of one HA entity
        self,
        key: str,
        name: str,
        unit: str,
        device_class: "str | None" = None,
        entity_category: "str | None" = None,
        icon: "str | None" = None,
    ) -> None:
        self.key = key
        self.name = name
        self.unit = unit
        self.device_class = device_class
        self.entity_category = entity_category
        self.icon = icon


# All three read from one retained JSON state topic via value_template: a
# single publish per cycle, and no partially-stale entities after a restart.
ENTITIES = (
    Entity("level", "Fill level", "%", icon="mdi:water-percent"),
    Entity(
        "distance",
        "Distance to water",
        "mm",
        device_class="distance",
        entity_category=ENTITY_CATEGORY_DIAGNOSTIC,
    ),
    Entity(
        "rssi",
        "Wi-Fi signal",
        "dBm",
        device_class="signal_strength",
        entity_category=ENTITY_CATEGORY_DIAGNOSTIC,
    ),
)


def _default_rssi() -> "int | None":
    try:
        return WLAN(WLAN.IF_STA).status("rssi")
    except (OSError, ValueError, TypeError):
        return None


def _default_device_id() -> str:
    return hexlify(unique_id()).decode()


class MqttPublisher:
    """Publishes the tank level to Home Assistant over MQTT.

    Only ever started in station mode with a configured broker -- in the
    recovery access point there is no broker to reach, and a retrying client
    would just consume RAM while the user is trying to reconfigure the device.
    """

    def __init__(
        self,
        water_tank: "Any",  # noqa: ANN401 - duck-typed on get_statistics()
        client_factory: "Callable[[dict[str, Any]], Any] | None" = None,
        rssi_fn: "Callable[[], int | None]" = _default_rssi,
        device_id_fn: "Callable[[], str]" = _default_device_id,
    ) -> None:
        self._water_tank = water_tank
        self._client_factory = client_factory or _create_mqtt_as_client
        self._rssi = rssi_fn
        self.device_id = device_id_fn()

    # --- topics ------------------------------------------------------------

    @property
    def state_topic(self) -> str:
        return Mqtt.topic_prefix + "/state"

    @property
    def availability_topic(self) -> str:
        return Mqtt.topic_prefix + "/status"

    def discovery_topic(self, entity: Entity) -> str:
        return f"{Mqtt.discovery_prefix}/sensor/{self.device_id}/{entity.key}/config"

    # --- payloads ----------------------------------------------------------

    def device_payload(self) -> "dict[str, Any]":
        return {
            "identifiers": [DEVICE_ID_PREFIX + "_" + self.device_id],
            "name": DEVICE_NAME,
            "model": DEVICE_MODEL,
            "manufacturer": DEVICE_MANUFACTURER,
        }

    def discovery_payload(self, entity: Entity) -> "dict[str, Any]":
        payload: "dict[str, Any]" = {
            "name": entity.name,
            "unique_id": f"{DEVICE_ID_PREFIX}_{self.device_id}_{entity.key}",
            "state_topic": self.state_topic,
            "value_template": "{{ value_json." + entity.key + " }}",
            "unit_of_measurement": entity.unit,
            "state_class": STATE_CLASS_MEASUREMENT,
            "availability_topic": self.availability_topic,
            "payload_available": PAYLOAD_ONLINE,
            "payload_not_available": PAYLOAD_OFFLINE,
            "device": self.device_payload(),
        }

        if entity.device_class is not None:
            payload["device_class"] = entity.device_class
        if entity.entity_category is not None:
            payload["entity_category"] = entity.entity_category
        if entity.icon is not None:
            payload["icon"] = entity.icon

        return payload

    def state_payload(self) -> "dict[str, Any]":
        statistics = self._water_tank.get_statistics()

        return {
            "level": statistics["level"],
            "distance": statistics["distance_to_water"],
            "rssi": self._rssi(),
        }

    def client_config(self) -> "dict[str, Any]":
        return {
            "server": Mqtt.host,
            "port": Mqtt.port,
            "user": Mqtt.user or "",
            "password": Mqtt.password or "",
            "ssid": Wifi.ssid,
            "wifi_pw": Wifi.key or "",
            "keepalive": Mqtt.keepalive_s,
            "queue_len": QUEUE_LENGTH,
            "will": (self.availability_topic, PAYLOAD_OFFLINE, RETAIN, QOS_AT_LEAST_ONCE),
        }

    # --- async plumbing ----------------------------------------------------

    async def _announce(self, client: "Any") -> None:
        """(Re-)publish discovery and availability after every connect.

        Doing this on reconnect rather than only at startup means the device
        reappears on its own if the broker is wiped or replaced.
        """
        for entity in ENTITIES:
            await client.publish(
                self.discovery_topic(entity),
                dumps(self.discovery_payload(entity)),
                RETAIN,
                QOS_AT_LEAST_ONCE,
            )

        await client.publish(self.availability_topic, PAYLOAD_ONLINE, RETAIN, QOS_AT_LEAST_ONCE)

    async def _announce_on_every_connect(self, client: "Any") -> None:
        while True:
            await client.up.wait()
            client.up.clear()
            await self._announce(client)

    async def publish_state(self, client: "Any") -> None:
        await client.publish(
            self.state_topic, dumps(self.state_payload()), RETAIN, QOS_AT_LEAST_ONCE
        )

    async def run(self) -> None:
        client = self._client_factory(self.client_config())

        await client.connect()
        asyncio.create_task(self._announce_on_every_connect(client))

        while True:
            await self.publish_state(client)
            await asyncio.sleep(Mqtt.publish_interval_s)


def _create_mqtt_as_client(overrides: "dict[str, Any]") -> "Any":
    """Built here rather than at import time so tests never load mqtt_as."""
    from external.mqtt_as import MQTTClient  # noqa: PLC0415
    from external.mqtt_as import config as base_config  # noqa: PLC0415

    config = dict(base_config)
    config.update(overrides)

    return MQTTClient(config)
