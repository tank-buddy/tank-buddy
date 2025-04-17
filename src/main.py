from machine import Pin, SoftI2C, Timer, reset, soft_reset
from external.vl53l0x import VL53L0X
from external.microdot import Microdot
from config import Config

config = Config('./conf.json')

app = Microdot()
i2c = SoftI2C(scl=Pin(1),sda=Pin(0))
tof = VL53L0X(i2c)

@app.route('/', methods=['GET'])
def healthCheck(request):
    return {
        'success': True,
        'message': 'Ok'
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
def resetSystem(request, operation):
    period = 1000
    timer = Timer(1)
    
    if operation == 'soft-reset':
        timer.init(mode=Timer.ONE_SHOT, period=period, callback=lambda t:soft_reset())
        return {'success': True, 'message': f'System will perfrom a soft reset after {period} ms.'}
    
    timer.init(mode=Timer.ONE_SHOT, period=period, callback=lambda t:reset())
    return {'success': True, 'message': f'System will perfrom a hard reset after {period} ms.'}

app.run(port=80, host='0.0.0.0', debug=True)
