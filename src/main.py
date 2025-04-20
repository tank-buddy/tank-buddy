from machine import Pin, SoftI2C, reset, soft_reset
from external.vl53l0x import VL53L0X
from external.microdot import Microdot, Response
from config import Config
from asyncio import sleep, create_task
from sys import implementation

Response.default_content_type = 'application/json'

config = Config('./conf.json')

app = Microdot()
i2c = SoftI2C(scl=Pin(1),sda=Pin(0))
tof = VL53L0X(i2c)

@app.route('/', methods=['GET'])
def healthCheck(request):
    return {
        'success': True,
        'system': {
            'micropythonVersion': implementation.version,
            'hardware': implementation._machine
        }
    }


@app.route('/water-tank', methods=['GET'])
def getWaterTankInfo(request):    
    return {
        'distance': {
            'cm': tof.range
        }
    }

@app.route('/config', methods=['GET'])
def getConfig(request):
    return config.toJson()

@app.route('/config', methods=['POST'])
def persistConfig(request):
    try:
        config.apply(request.json)
        return 201
    except Exception as e:
        return {'success': False, 'message': str(e)}, 400

@app.route('/system/<re:(soft-reset|hard-reset):operation>', methods=['PUT'])
async def resetSystem(request, operation):
    async def executeOperation(operation, delay):
        await sleep(delay)
        
        if operation == 'soft-reset':
            soft_reset()
            return
        
        reset()
    
    delay = 5

    create_task(executeOperation(operation, delay))
    return {'success': True, 'message': f'System will perfrom a {operation.replace('-', ' ')} in {delay} seconds.'}

app.run(port=80, host='0.0.0.0', debug=True)
