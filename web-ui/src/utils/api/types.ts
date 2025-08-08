export type WifiInterface = 'C' | 'AP'

export interface ConfigInterface {
  wifi: {
    interface: WifiInterface
    ssid: string
    key?: string
  }
  waterTank: {
    height: number
    minDistance: number
  }
}

export interface WaterTankInterface {
  height: number
  distanceToWater: number
  timestamp: number
}

export type SystemOperationIdentifier = 'hard-reset' | 'soft-reset'
