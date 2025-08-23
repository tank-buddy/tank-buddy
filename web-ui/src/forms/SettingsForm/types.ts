import type { WifiInterface } from '../../utils/api/types.ts'

export interface SettingsInterface {
  'wifi.interface': WifiInterface
  'wifi.ssid': string
  'wifi.key'?: string | undefined
  'waterTank.height': number
  'waterTank.minDistance': number
}
