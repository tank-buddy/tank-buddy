import type { LevelInterface, SettingsInterface } from '../src/utils/api/types'

export const TANK_HEIGHT = 1000
export const MIN_DISTANCE = 50

/** Mirrors `settings.to_dict()` -- every key in MUTABLE_FIELDS. */
export const SETTINGS: SettingsInterface = {
  wifi: {
    mode: 'AP',
    ssid: 'TankBuddy',
    key: '',
  },
  mqtt: {
    enabled: false,
    host: '',
    port: 1883,
    user: '',
    password: '',
    publish_interval_s: 30,
    topic_prefix: 'tankbuddy',
    discovery_prefix: 'homeassistant',
  },
  tank: {
    height: TANK_HEIGHT,
    min_distance: MIN_DISTANCE,
  },
  board: {
    i2c_scl_pin: 1,
    i2c_sda_pin: 0,
  },
}

/**
 * Deterministic, unlike the random value the old mocks-server route produced —
 * tests cannot assert against a moving target.
 */
export const level = (measured = 300): LevelInterface => {
  const distanceToWater = Math.max(measured - MIN_DISTANCE, 0)

  // The percentage is computed on the device, not in the browser.
  const value = Math.max(
    0,
    Math.min(
      100,
      Math.floor(((TANK_HEIGHT - distanceToWater) * 100) / TANK_HEIGHT)
    )
  )

  return {
    height: TANK_HEIGHT,
    min_distance: MIN_DISTANCE,
    measured_distance: measured,
    distance_to_water: distanceToWater,
    level: value,
  }
}

/** A device that has not taken its first reading yet. */
export const NO_READING: LevelInterface = {
  height: TANK_HEIGHT,
  min_distance: MIN_DISTANCE,
  measured_distance: null,
  distance_to_water: null,
  level: null,
}
