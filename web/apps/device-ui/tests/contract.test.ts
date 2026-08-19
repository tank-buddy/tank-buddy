import { expect, test } from 'vitest'
import { SETTINGS } from '../mocks/fixtures'
import { getSettings } from '../src/utils/api'

/**
 * The device is the source of truth: `settings.MUTABLE_FIELDS` in
 * src/settings.py defines what the API accepts. These tests pin the shape the
 * UI assumes, so a drift shows up here instead of on the device.
 */

/** Every dot path the settings form binds to. Mirrors FIELDS in SettingsPanel. */
const FORM_PATHS = [
  'wifi.mode',
  'wifi.ssid',
  'wifi.key',
  'mqtt.enabled',
  'mqtt.host',
  'mqtt.port',
  'mqtt.user',
  'mqtt.password',
  'mqtt.topic_prefix',
  'tank.height',
  'tank.min_distance',
  'board.i2c_scl_pin',
  'board.i2c_sda_pin',
]

const flatten = (value: object, prefix = ''): string[] =>
  Object.entries(value).flatMap(([key, nested]) =>
    typeof nested === 'object' && nested !== null
      ? flatten(nested as object, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  )

test('every field the form binds to exists in the settings response', async () => {
  const settings = await getSettings()
  const available = flatten(settings)

  expect(available).toEqual(expect.arrayContaining(FORM_PATHS))
})

test('the settings response carries no field the form cannot show', () => {
  // mqtt.discovery_prefix is deliberately not exposed: it is a Home Assistant
  // detail that the defaults already get right.
  const unexposed = flatten(SETTINGS).filter(
    (path) => !FORM_PATHS.includes(path)
  )

  expect(unexposed).toEqual([
    'mqtt.publish_interval_s',
    'mqtt.discovery_prefix',
  ])
})
