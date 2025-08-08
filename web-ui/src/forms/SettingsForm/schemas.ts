import { z } from 'zod/mini'

export const SettingsFormSchema = z.object({
  'wifi.interface': z.enum(['C', 'AP']),
  'wifi.ssid': z.string().check(z.minLength(1), z.trim()),
  'wifi.key': z.optional(z.string()),
  'waterTank.height': z.number().check(z.minimum(1)),
  'waterTank.minDistance': z.number().check(z.minimum(0)),
})
