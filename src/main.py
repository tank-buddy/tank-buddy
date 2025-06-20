from machine import Pin, SoftI2C, reset, soft_reset
from external.vl53l0x import VL53L0X
from external.microdot import Microdot, Response, send_file
from config import Config
from asyncio import sleep, create_task
from sys import implementation
from os import stat, statvfs
from gc import collect, mem_alloc, mem_free
from esp import flash_size
from ssl import SSLContext, PROTOCOL_TLS_SERVER

MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
}

Response.default_content_type = "application/json"

sslContext = SSLContext(PROTOCOL_TLS_SERVER)
sslContext.load_cert_chain('cert/cert.der', 'cert/key.der')

config = Config("./conf.json")

app = Microdot()
i2c = SoftI2C(scl=Pin(1), sda=Pin(0))
tof = VL53L0X(i2c)

@app.route("/api", methods=["GET"])
def healthCheck(request):
    collect()
    freeRam = mem_free() // 1024
    allocatedRam = mem_alloc() // 1024
    totalRam = (mem_free() + mem_alloc()) // 1024

    flashSize = flash_size() // 1024
    fsStat = statvfs('/')
    fsTotal = (fsStat[0] * fsStat[2]) // 1024
    fsFree = (fsStat[0] * fsStat[3]) // 1024

    return {
        "micropythonVersion": implementation.version,
        "hardware": implementation._machine,
        "ram": {
            "used": allocatedRam,
            "free": freeRam,
            "total": totalRam,
        },
        "flash": {
            "used": fsTotal,
            "free": fsFree,
            "total": flashSize,
        }
    }


@app.route("/api/water-tanks/default", methods=["GET"])
def getWaterTankInfo(request):
    return {
        "height": config.get('waterTank.height'),
        "distanceToWater": tof.range,
    }


@app.route("/api/configs/default", methods=["GET"])
def getConfig(request):
    return config.toJson()


@app.route("/api/configs/default", methods=["PATCH"])
def persistConfig(request):
    try:
        config.apply(request.json)
        return 200
    except Exception as e:
        return {"success": False, "message": str(e)}, 400


@app.route("/api/system-operations/<re:(soft-reset|hard-reset):operation>", methods=["PUT"])
async def resetSystem(request, operation):
    async def executeOperation(operation, delay):
        await sleep(delay)

        if operation == "soft-reset":
            soft_reset()
            return

        reset()

    delay = 5

    create_task(executeOperation(operation, delay))
    return {
        "success": True,
        "message": f"System will perfrom a {operation.replace('-', ' ')} in {delay} seconds.",
    }


@app.route('/<path:path>')
def staticOr404(request, path):
    def getExtension(path):
        dot = path.rfind('.')
        
        if dot == -1:
            return ''
        
        return path[dot:]

    def fileExists(path):
        try:
            stat(path)
            return True
        except OSError:
            return False

    if path.startswith('api'):
        return 'Not Found', 404

    gzPath = f'/www/{path}.gz'
    if not fileExists(gzPath):
        return 'Not Found', 404

    extension = getExtension(path)
    contentType = MIME_TYPES.get(extension, 'application/octet-stream')

    return send_file(gzPath, 200, contentType, compressed=True)

@app.route('/')
@app.route('/<path:path>')
def index(request, path=''):
    if path.startswith('api'):
        return 'Not Found', 404

    return send_file('/www/index.html.gz', 200, 'text/html', compressed=True)

app.run(port=443, host="0.0.0.0", ssl=sslContext, debug=True)
