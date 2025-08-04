import clsx from 'clsx'
import {
  type ForwardedRef,
  type ForwardRefRenderFunction,
  forwardRef,
} from 'preact/compat'
import ChevronDown from '../../assets/chevron-down.svg?react'
import type { SelectPropsInterface } from './types.ts'

const Select: ForwardRefRenderFunction<
  HTMLSelectElement,
  SelectPropsInterface
> = (props: SelectPropsInterface, ref: ForwardedRef<HTMLSelectElement>) => {
  const { name, options, className, value, error, ...rest } = props

  return (
    <div class="relative">
      <select
        ref={ref}
        name={name}
        class={clsx(
          'w-full h-11 pl-4 pr-10 py-2.5 text-sm appearance-none border border-gray-300 bg-transparent text-gray-800',
          'dark:border-gray-700 dark:bg-gray-900 dark:text-white/90',
          'focus:outline-hidden focus:ring-3 focus:border-teal-300 focus:ring-teal-500/20',
          'dark:focus:border-teal-800',
          error?.value
            ? 'border-red-300 focus:border-red-300 focus:ring-red-500/20 dark:border-red-800 dark:focus:border-red-800'
            : 'focus:border-teal-300 focus:ring-teal-500/20 dark:focus:border-teal-800',
          className
        )}
        aria-invalid={!!error}
        {...rest}
      >
        {Object.keys(options).map((optionValue) => {
          return (
            <option
              value={optionValue}
              selected={options[optionValue] === value.value}
            >
              {options[optionValue]}
            </option>
          )
        })}
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <ChevronDown className="h-6 w-6 text-teal-300 dark:text-gray-700" />
      </div>
    </div>
  )
}

export default forwardRef(Select)
