import type { InferInput } from 'valibot'
import type { SettingsFormSchema } from './schemas.ts'

export type Settings = InferInput<typeof SettingsFormSchema>
