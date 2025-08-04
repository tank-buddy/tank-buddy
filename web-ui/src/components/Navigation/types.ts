import type { VNode } from 'preact'
import type { TranslateFN } from '../../providers/IntlProvider/types.ts'

export interface LinkInterface {
  label: (t: TranslateFN) => string
  path: string
  icon: VNode
}
