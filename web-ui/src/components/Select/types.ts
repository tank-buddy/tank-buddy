import type { JSX } from 'preact'

export interface SelectPropsInterface {
  name: string
  options: Record<string | number, string>
  value: string | number | undefined
  onChange?: JSX.GenericEventHandler<HTMLSelectElement>
  className?: string
  placeholder?: string
  required?: boolean
  error?: boolean
}
