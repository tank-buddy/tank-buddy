import type { ComponentChildren } from 'preact'

export interface AlertPropsInterface {
  type: 'success' | 'warning' | 'error'
  children: ComponentChildren
}
