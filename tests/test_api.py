import gzip
import pathlib

import pytest

import settings
from api import Api
from external.microdot import Microdot, TestClient
from settings import Tank

try:
    from typing import Any
except ImportError:  # pragma: no cover
    pass


class DummyHardware:
    def __init__(self) -> None:
        self.last_reset: "tuple[str, int] | None" = None

    def get_info(self) -> "dict[str, Any]":
        return {"hw": "ok"}

    def reset(self, kind: str, delay: int) -> None:
        self.last_reset = (kind, delay)


class DummyWaterTank:
    def get_statistics(self) -> "dict[str, Any]":
        return {"level": 62, "distance_to_water": 105, "height": 280, "min_distance": 30}


class RealFileSystem:
    """Backed by the real filesystem so static serving is exercised end to end."""

    def file_exists(self, path: str) -> bool:
        return pathlib.Path(path).exists()

    def get_extension(self, path: str) -> str:
        dot = path.rfind(".")
        return path[dot:] if dot != -1 else ""


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
def hardware() -> DummyHardware:
    return DummyHardware()


@pytest.fixture
def overlay(tmp_path: pathlib.Path) -> str:
    return str(tmp_path / "settings.json")


@pytest.fixture
def static_root(tmp_path: pathlib.Path) -> str:
    """A /www stand-in holding gzip-only assets, exactly as the device has them."""
    root = tmp_path / "www"
    root.mkdir()
    (root / "index.html.gz").write_bytes(gzip.compress(b"<!doctype html><title>TankBuddy</title>"))
    (root / "style.css.gz").write_bytes(gzip.compress(b"body{margin:0}"))
    (root / "manifest.webmanifest.gz").write_bytes(gzip.compress(b'{"name":"TankBuddy"}'))
    # No .gz counterpart on purpose: gzip cannot shrink a PNG, so the build ships
    # the home-screen icon uncompressed.
    (root / "apple-touch-icon.png").write_bytes(b"\x89PNG\r\n\x1a\n")
    return str(root)


@pytest.fixture
def client(hardware: DummyHardware, static_root: str, overlay: str) -> TestClient:
    app = Microdot()
    Api(
        http_app=app,
        file_system=RealFileSystem(),  # type: ignore[arg-type]
        hardware=hardware,  # type: ignore[arg-type]
        water_tank=DummyWaterTank(),  # type: ignore[arg-type]
        static_root=static_root,
        overlay_path=overlay,
    )
    return TestClient(app)


async def test_get_level(client: TestClient) -> None:
    response = await client.get("/api/level")

    assert response.status_code == 200
    assert response.json is not None
    assert response.json["level"] == 62


async def test_get_settings_returns_every_mutable_field(client: TestClient) -> None:
    response = await client.get("/api/settings")

    assert response.status_code == 200
    assert response.json is not None
    assert set(settings.flatten(response.json)) == set(settings.MUTABLE_FIELDS)


async def test_patch_settings_persists_and_reports_hot_change(
    client: TestClient, overlay: str
) -> None:
    response = await client.patch("/api/settings", body={"tank": {"height": 500}})

    assert response.status_code == 200
    assert response.json == {"success": True, "reboot_required": False}
    assert Tank.height == 500
    assert pathlib.Path(overlay).exists()


async def test_patch_settings_reports_reboot_for_connection_changes(client: TestClient) -> None:
    response = await client.patch("/api/settings", body={"wifi": {"ssid": "NewNet"}})

    assert response.status_code == 200
    assert response.json is not None
    assert response.json["reboot_required"] is True


async def test_patch_settings_rejects_invalid_payload(client: TestClient, overlay: str) -> None:
    response = await client.patch("/api/settings", body={"tank": {"height": -1}})

    assert response.status_code == 400
    assert response.json is not None
    assert response.json["success"] is False
    assert not pathlib.Path(overlay).exists(), "a rejected patch must not be persisted"


async def test_patch_settings_rejects_unknown_keys(client: TestClient) -> None:
    response = await client.patch("/api/settings", body={"wifi": {"channel": 6}})

    assert response.status_code == 400


async def test_get_hardware_info(client: TestClient) -> None:
    response = await client.get("/api")

    assert response.status_code == 200
    assert response.json == {"hw": "ok"}


@pytest.mark.parametrize(
    ("operation", "expected_kind"),
    [("soft-reset", "soft"), ("hard-reset", "hard")],
)
async def test_system_operation_schedules_reset(
    client: TestClient, hardware: DummyHardware, operation: str, expected_kind: str
) -> None:
    response = await client.put(f"/api/system-operations/{operation}")

    assert response.status_code == 200
    assert hardware.last_reset is not None
    assert hardware.last_reset[0] == expected_kind


async def test_static_file_is_served_gzipped(client: TestClient) -> None:
    response = await client.get("/style.css")

    assert response.status_code == 200
    assert response.headers["Content-Type"] == "text/css"
    assert response.headers["Content-Encoding"] == "gzip"


async def test_web_app_manifest_is_served_with_its_own_type(client: TestClient) -> None:
    # Adding the UI to an iOS home screen needs the manifest, and iOS only reads
    # it when the type is right -- without the mapping it would fall back to
    # application/octet-stream.
    response = await client.get("/manifest.webmanifest")

    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/manifest+json"
    assert response.headers["Content-Encoding"] == "gzip"


async def test_uncompressed_asset_is_served_as_is(client: TestClient) -> None:
    # Without this branch the home-screen icon would fall through to the SPA
    # index and iOS would show a screenshot placeholder instead.
    response = await client.get("/apple-touch-icon.png")

    assert response.status_code == 200
    assert response.headers["Content-Type"] == "image/png"
    assert "Content-Encoding" not in response.headers


async def test_missing_static_file_falls_back_to_index(client: TestClient) -> None:
    # SPA routing: any non-api path that is not a real file renders index.html.
    response = await client.get("/missing.css")

    assert response.status_code == 200
    assert response.headers["Content-Type"] == "text/html"


async def test_index_root(client: TestClient) -> None:
    response = await client.get("/")

    assert response.status_code == 200


async def test_unknown_api_path_is_404_not_the_spa_fallback(client: TestClient) -> None:
    response = await client.get("/api/hidden")

    assert response.status_code == 404
