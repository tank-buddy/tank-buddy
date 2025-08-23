import clsx from 'clsx'
import ChevronDown from '../Icon/ChevronDown'
import type { SelectPropsInterface } from './types.ts'

const Select = (props: SelectPropsInterface) => {
  const { name, options, className, value, error, onChange, ...rest } = props

  return (
    <div class="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        class={clsx(
          'w-full h-11 pl-4 pr-10 py-2.5 text-sm appearance-none border border-gray-300 bg-transparent text-gray-800',
          'dark:border-gray-700 dark:bg-gray-900 dark:text-white/90',
          'focus:outline-hidden focus:ring-3',
          error
            ? 'border-red-300 focus:border-red-300 focus:ring-red-500/20 dark:border-red-800 dark:focus:border-red-800'
            : 'focus:border-teal-300 focus:ring-teal-500/20 dark:focus:border-teal-800',
          className
        )}
        aria-invalid={!!error}
        {...rest}
      >
        {Object.entries(options).map(([optionValue, label]) => (
          <option value={optionValue}>{label}</option>
        ))}
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <ChevronDown className="h-6 w-6 text-teal-300 dark:text-gray-700" />
      </div>
    </div>
  )
}

export default Select
