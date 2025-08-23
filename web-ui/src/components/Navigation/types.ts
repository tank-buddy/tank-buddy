import type { VNode } from 'preact'
import type { TranslateFN } from '../../utils/i18n/types.ts'

export interface LinkInterface {
  label: (t: TranslateFN) => string
  path: string
  icon: VNode
}
