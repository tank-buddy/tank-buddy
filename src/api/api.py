# Microdot is vendored upstream code without annotations, so every call into it
# degrades to Unknown, and its route decorators register handlers that nothing
# else references. Both are properties of that dependency, not of this module.
# pyright: reportUnknownMemberType=false, reportUnusedFunction=false
# pyright: reportUnknownVariableType=false
import settings
from external.microdot import Microdot, Request, Response, send_file
from file_system import FileSystem
from hardware import Hardware
from settings import SettingsError
from water_tank import WaterTank

try:
    from typing import Any
except ImportError:  # pragma: no cover
    pass

HTTP_HOST = "0.0.0.0"  # noqa: S104 - a LAN appliance must listen on every interface
CACHE_MAX_AGE_SECONDS = 31536000

# The Vite build emits gzip only and deletes the originals, so every asset on
# device exists solely as `<name>.gz`.
STATIC_ROOT = "/www"
GZIP_SUFFIX = ".gz"
INDEX_FILE = "index.html"
DEFAULT_MIME_TYPE = "application/octet-stream"

RESET_OPERATIONS = {"soft-reset": "soft", "hard-reset": "hard"}


class Api:
    MIME_TYPES = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".woff2": "font/woff2",
        # Serves the home-screen manifest. Adding the app to an iOS home screen
        # works over plain HTTP; only a service worker would need TLS.
        ".webmanifest": "application/manifest+json",
    }

    def __init__(  # noqa: PLR0913, PLR0917 - hand-wired dependencies, no DI container
        self,
        http_app: Microdot,
        file_system: FileSystem,
        hardware: Hardware,
        water_tank: WaterTank,
        static_root: str = STATIC_ROOT,
        # The settings module is injected rather than imported directly so
        # tests can point it at a temporary overlay file.
        settings_module: "Any" = settings,  # noqa: ANN401
        overlay_path: str = settings.OVERLAY_PATH,
    ) -> None:
        self.http_app = http_app
        self.file_system = file_system
        self.hardware = hardware
        self.water_tank = water_tank
        self.static_root = static_root
        self.settings = settings_module
        self.overlay_path = overlay_path
        self._register_api_routes()
        self._register_static_routes()

    def _register_api_routes(self) -> None:
        @self.http_app.route("/api", methods=["GET"])
        def get_hardware_info(request: Request) -> "Any":
            return self.hardware.get_info()

        @self.http_app.route("/api/level", methods=["GET"])
        def get_level(request: Request) -> "Any":
            return self.water_tank.get_statistics()

        @self.http_app.route("/api/settings", methods=["GET"])
        def get_settings(request: Request) -> "Any":
            return self.settings.to_dict()

        @self.http_app.route("/api/settings", methods=["PATCH"])
        def patch_settings(request: Request) -> "Any":
            try:
                reboot_required = self.settings.apply(request.json, self.overlay_path)
            except SettingsError as error:
                return {"success": False, "message": str(error)}, 400

            return {"success": True, "reboot_required": reboot_required}, 200

        @self.http_app.route(
            "/api/system-operations/<re:(soft-reset|hard-reset):operation>",
            methods=["PUT"],
        )
        async def reset_hardware(request: Request, operation: str) -> "Any":
            delay = self.settings.Board.reset_delay_s
            self.hardware.reset(RESET_OPERATIONS[operation], delay)

            return {
                "success": True,
                "message": f"System will perform a {operation.replace('-', ' ')} in {delay}s.",
            }

    def _register_static_routes(self) -> None:
        @self.http_app.route("/")
        def serve_index(request: Request) -> "Any":
            return send_file(
                f"{self.static_root}/{INDEX_FILE}{GZIP_SUFFIX}",
                200,
                self.MIME_TYPES[".html"],
                compressed=True,
                max_age=CACHE_MAX_AGE_SECONDS,
            )

        @self.http_app.route("/<path:path>")
        def serve_static(request: Request, path: str = "") -> "Any":
            # Unknown API routes must 404 rather than fall through to the SPA.
            if path.startswith("api"):
                return "Not Found", 404

            extension = self.file_system.get_extension(path)
            content_type = self.MIME_TYPES.get(extension, DEFAULT_MIME_TYPE)

            gzip_path = f"{self.static_root}/{path}{GZIP_SUFFIX}"
            if self.file_system.file_exists(gzip_path):
                return send_file(
                    gzip_path, 200, content_type, compressed=True, max_age=CACHE_MAX_AGE_SECONDS
                )

            # Already-compressed binaries -- the home-screen icon is the only one
            # -- ship uncompressed: gzip cannot shrink a PNG, so the build never
            # emits a .gz for it and this is the only branch that can serve it.
            plain_path = f"{self.static_root}/{path}"
            if self.file_system.file_exists(plain_path):
                return send_file(plain_path, 200, content_type, max_age=CACHE_MAX_AGE_SECONDS)

            return serve_index(request)

    async def start(self) -> None:
        """Serve forever.

        This is a coroutine rather than Microdot's blocking `run()`, so the
        measurement and MQTT tasks can run alongside it on the same loop.
        """
        Response.default_content_type = "application/json"

        await self.http_app.start_server(host=HTTP_HOST, port=self.settings.Http.port, debug=False)
