import type { ReadonlySignal } from '@preact/signals'
import type { JSX } from 'preact'

export interface SelectPropsInterface {
  name: string
  options: Record<string, string>
  onInput: JSX.GenericEventHandler<HTMLSelectElement>
  onChange: JSX.GenericEventHandler<HTMLSelectElement>
  onBlur: JSX.FocusEventHandler<HTMLSelectElement>
  className?: string
  placeholder?: string
  value: ReadonlySignal<string | null | undefined>
  error?: ReadonlySignal<string>
  required?: boolean
}
