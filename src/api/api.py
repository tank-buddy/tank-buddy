from external.microdot import send_file, Response, Microdot
from config import Config
from file_system import FileSystem
from hardware import Hardware
from water_tank import WaterTank
from ssl import SSLContext

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
    }

    def __init__(
        self,
        config: Config,
        http_app: Microdot,
        file_system: FileSystem,
        hardware: Hardware,
        water_tank: WaterTank,
        ssl_context: SSLContext
    ):
        self.config = config
        self.http_app = http_app
        self.file_system = file_system
        self.hardware = hardware
        self.water_tank = water_tank
        self.ssl_context = ssl_context
        self._register_routes()

    def _register_routes(self):
        @self.http_app.route("/api", methods=["GET"])
        def get_hardware_info(request):
            return self.hardware.get_info()

        @self.http_app.route("/api/water-tanks/default", methods=["GET"])
        def get_water_tank_statistics(request):
            return self.water_tank.get_statistics()

        @self.http_app.route("/api/configs/default", methods=["GET"])
        def get_config(request):
            return self.config.to_json()

        @self.http_app.route("/api/configs/default", methods=["PATCH"])
        def persist_config(request):
            try:
                self.config.apply(request.json)
                return request.json, 200
            except Exception as e:
                return {"success": False, "message": str(e)}, 400

        @self.http_app.route(
            "/api/system-operations/<re:(soft-reset|hard-reset):operation>",
            methods=["PUT"],
        )
        async def reset_hardware(request, operation):
            delay = 5
            self.hardware.reset(operation.split("-")[0], delay)

            return {
                "success": True,
                "message": f"System will perfrom a {operation.replace('-', ' ')} in {delay} seconds.",
            }

        @self.http_app.route("/")
        def serve_index(request):
            return send_file("/www/index.html.gz", 200, "text/html", compressed=True, max_age=31536000)
        
        @self.http_app.route("/<path:path>")
        def serve_static(request, path=""):
            if path.startswith("api"):
                return "Not Found", 404

            gzPath = f"/www/{path}.gz"
            if self.file_system.file_exists(gzPath):
                extension = self.file_system.get_extension(path)
                contentType = self.MIME_TYPES.get(extension, "application/octet-stream")

                return send_file(gzPath, 200, contentType, compressed=True, max_age=31536000)

            return serve_index(request)

    def run(self):
        Response.default_content_type = "application/json"

        self.http_app.run(port=443, host="0.0.0.0", debug=False, ssl=self.ssl_context)
