import type { JSX } from 'preact'

export interface SelectPropsInterface {
  name: string
  options: Record<string | number, string>
  onInput: JSX.GenericEventHandler<HTMLSelectElement>
  onChange?: JSX.GenericEventHandler<HTMLSelectElement>
  onBlur?: JSX.FocusEventHandler<HTMLSelectElement>
  className?: string
  placeholder?: string
  value: string | number | undefined
  error?: string
  required?: boolean
}
