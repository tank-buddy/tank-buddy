export interface ConfigInterface {
  hostname: string
  wifi: {
    interface: 'C' | 'AP'
    ssid: string
    key?: string
  }
  waterTank: {
    height: number
  }
}

export interface WaterTankInterface {
  height: number
  distanceToWater: number
}
