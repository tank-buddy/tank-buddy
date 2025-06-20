import { asFormControl } from '@shelacek/formica'
import cn from '../utils/cn'

interface SelectPropsInterface {
  name: string
  className?: string
  required?: boolean
  value?: string
  options: Record<string, string>
}

const Select = asFormControl((props: SelectPropsInterface) => {
  const { name, className, required, value, options } = props

  return (
    <div className="relative">
      <select
        className={cn(
          'w-full h-11 pl-4 pr-10 py-2.5 text-sm appearance-none border border-gray-300 bg-transparent text-gray-800',
          'dark:border-gray-700 dark:bg-gray-900 dark:text-white/90',
          'focus:outline-hidden focus:ring-3 focus:border-teal-300 focus:ring-teal-500/20',
          'dark:focus:border-teal-800',
          className
        )}
        name={name}
        required={required}
        value={value}
      >
        {Object.entries(options).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
        <svg
          className="h-6 w-6 text-teal-300 dark:text-gray-700"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  )
})

export default Select
