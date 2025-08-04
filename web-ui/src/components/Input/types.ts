import type { ReadonlySignal } from '@preact/signals'
import type { JSX } from 'preact'

export interface InputPropsInterface {
  name: string
  //ref: Ref<HTMLInputElement>
  onInput: JSX.GenericEventHandler<HTMLInputElement>
  onChange: JSX.GenericEventHandler<HTMLInputElement>
  onBlur: JSX.FocusEventHandler<HTMLInputElement>
  type?: 'text' | 'number' | 'password' | 'email'
  className?: string
  placeholder?: string
  value: ReadonlySignal<string | number | undefined>
  error?: ReadonlySignal<string>
  required?: boolean
}
