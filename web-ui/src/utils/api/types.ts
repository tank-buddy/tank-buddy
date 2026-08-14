export type WifiMode = 'C' | 'AP'

/** Mirrors `MUTABLE_FIELDS` in src/settings.py. Keep both in sync. */
export interface SettingsInterface {
  wifi: {
    mode: WifiMode
    ssid: string
    key: string | null
  }
  mqtt: {
    enabled: boolean
    host: string
    port: number
    user: string | null
    password: string | null
    publish_interval_s: number
    topic_prefix: string
    discovery_prefix: string
  }
  tank: {
    height: number
    min_distance: number
  }
}

/** Response of `GET /api/level`. Null until the first sensor reading. */
export interface LevelInterface {
  level: number | null
  distance_to_water: number | null
  measured_distance: number | null
  height: number
  min_distance: number
}

export interface PatchSettingsResultInterface {
  success: boolean
  reboot_required?: boolean
  message?: string
}

export interface SystemOperationResultInterface {
  success: boolean
  message?: string
}

export type SystemOperationIdentifier = 'hard-reset' | 'soft-reset'
