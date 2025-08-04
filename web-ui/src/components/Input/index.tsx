import { useSignal, useSignalEffect } from '@preact/signals'
import clsx from 'clsx'
import {
  type ForwardedRef,
  type ForwardRefRenderFunction,
  forwardRef,
} from 'preact/compat'
import type { InputPropsInterface } from './types.ts'

const Input: ForwardRefRenderFunction<HTMLInputElement, InputPropsInterface> = (
  props: InputPropsInterface,
  ref: ForwardedRef<HTMLInputElement>
) => {
  const { name, type, error, className, value, ...rest } = props
  const input = useSignal<string | number | undefined>(undefined)

  useSignalEffect(() => {
    if (!Number.isNaN(value.value)) {
      input.value = value.value === undefined ? '' : value.value
    }
  })

  return (
    <input
      ref={ref}
      name={name}
      class={clsx(
        'w-full h-11 px-4 py-2.5 text-sm appearance-none border border-gray-300 bg-transparent text-gray-800',
        'dark:border-gray-700 dark:bg-gray-900 dark:text-white/90',
        'focus:outline-hidden focus:ring-3',
        error?.value
          ? 'border-red-300 focus:border-red-300 focus:ring-red-500/20 dark:border-red-800 dark:focus:border-red-800'
          : 'focus:border-teal-300 focus:ring-teal-500/20 dark:focus:border-teal-800',
        className
      )}
      type={type === undefined ? 'text' : type}
      value={input}
      aria-invalid={!!error}
      {...rest}
    />
  )
}

export default forwardRef<HTMLInputElement, InputPropsInterface>(Input)
