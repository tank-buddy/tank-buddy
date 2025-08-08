import type { z } from 'zod/mini'
import type { SettingsFormSchema } from './schemas.ts'

export type Settings = z.infer<typeof SettingsFormSchema>
