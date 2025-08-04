import type { ComponentChildren } from 'preact'

export interface ButtonPropsInterface {
  className?: string
  disabled?: boolean
  type?: 'submit' | 'button' | 'reset'
  children?: ComponentChildren
  onClick?: () => void
}
