import { http, HttpResponse } from 'msw'
// The one definition of the bundle URL, imported rather than restated: a mock
// pointing somewhere the app does not is exactly how the CORS failure this
// endpoint was moved for stayed invisible in a green suite.
import { BUNDLE_URL } from '../src/utils/update'
import { level, NO_READING, SETTINGS } from './fixtures'

// Mirrors the reboot_required flags in MUTABLE_FIELDS (src/settings.py):
// connection settings and the sensor wiring need a restart -- the I2C bus is
// built once at start-up -- while tank geometry takes effect at once.
const REBOOT_REQUIRED_SECTIONS = ['wifi', 'mqtt', 'board']

/** Union of every supported chip's GPIO range; matches _GPIO_PIN_MAX. */
const GPIO_PIN_MAX = 48

const RESET_OPERATIONS = ['soft-reset', 'hard-reset']
const RESET_DELAY_S = 5

type PatchValue = string | number | boolean | null
type Patch = Partial<Record<string, Record<string, PatchValue | undefined>>>

/** Mirrors the validators in `settings.MUTABLE_FIELDS`. */
const validate = (patch: Patch): string | null => {
  const { wifi, mqtt, tank, board } = patch

  if (wifi?.mode !== undefined && !['C', 'AP'].includes(String(wifi.mode))) {
    return 'Value for wifi.mode is out of range'
  }
  if (wifi?.ssid !== undefined && String(wifi.ssid).length === 0) {
    return 'Value for wifi.ssid is out of range'
  }
  if (
    mqtt?.port !== undefined &&
    (Number(mqtt.port) <= 0 || Number(mqtt.port) > 65535)
  ) {
    return 'Value for mqtt.port is out of range'
  }
  if (tank?.height !== undefined && Number(tank.height) <= 0) {
    return 'Value for tank.height is out of range'
  }
  if (tank?.min_distance !== undefined && Number(tank.min_distance) < 0) {
    return 'Value for tank.min_distance is out of range'
  }

  for (const pin of ['i2c_scl_pin', 'i2c_sda_pin'] as const) {
    const value = board?.[pin]

    if (
      value !== undefined &&
      (Number(value) < 0 || Number(value) > GPIO_PIN_MAX)
    ) {
      return `Value for board.${pin} is out of range`
    }
  }

  return null
}

export const RELEASE_VERSION = 'v9.9.9'

/** Base64 of a one-byte payload; content does not matter to the transfer. */
const ENCODED_ASSET = 'eA=='

export const handlers = [
  http.get(BUNDLE_URL, () =>
    HttpResponse.json({
      version: RELEASE_VERSION,
      files: {
        'index.html.gz': ENCODED_ASSET,
        'assets/index-abc123.js.gz': ENCODED_ASSET,
      },
    })
  ),

  http.post('/api/web-ui', () => HttpResponse.json({ success: true })),

  http.put('/api/web-ui/*', () => HttpResponse.json({ success: true })),

  http.post('/api/web-ui/commit', () => HttpResponse.json({ success: true })),

  http.get('/api/level', () => HttpResponse.json(level())),

  http.get('/api/settings', () => HttpResponse.json(SETTINGS)),

  http.patch('/api/settings', async ({ request }) => {
    const patch = (await request.json()) as Patch
    const error = validate(patch)

    if (error !== null) {
      return HttpResponse.json(
        { success: false, message: error },
        { status: 400 }
      )
    }

    const rebootRequired = REBOOT_REQUIRED_SECTIONS.some(
      (section) => patch[section] !== undefined
    )

    return HttpResponse.json({ success: true, reboot_required: rebootRequired })
  }),

  http.put('/api/system-operations/:identifier', ({ params }) => {
    const identifier = String(params.identifier)

    if (!RESET_OPERATIONS.includes(identifier)) {
      return HttpResponse.json(
        { success: false, message: 'Identifier is not valid.' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      message: `System will perform a ${identifier.replace('-', ' ')} in ${RESET_DELAY_S}s.`,
    })
  }),
]

/** Override for the "device has not measured yet" case. */
export const noReadingHandler = http.get('/api/level', () =>
  HttpResponse.json(NO_READING)
)
