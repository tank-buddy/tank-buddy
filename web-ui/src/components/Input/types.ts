import type { JSX } from 'preact'

export interface InputPropsInterface {
  name: string
  onInput: JSX.GenericEventHandler<HTMLInputElement>
  onChange?: JSX.GenericEventHandler<HTMLInputElement>
  onBlur?: JSX.FocusEventHandler<HTMLInputElement>
  type?: 'text' | 'number' | 'password' | 'email'
  className?: string
  placeholder?: string
  value: string | number | undefined
  error?: string
  required?: boolean
}
