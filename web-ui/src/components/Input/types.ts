import type { JSX } from 'preact'

export interface InputPropsInterface {
  type?: 'text' | 'number' | 'password' | 'email'
  name: string
  value: string | number | undefined
  className?: string
  placeholder?: string
  required?: boolean
  error?: boolean
  onInput: JSX.GenericEventHandler<HTMLInputElement>
}
