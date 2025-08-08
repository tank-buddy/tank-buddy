import clsx from 'clsx'
import type { InputPropsInterface } from './types.ts'

const Input = (props: InputPropsInterface) => {
  const {
    name,
    type = 'text',
    error,
    className,
    value,
    onInput,
    ...rest
  } = props

  return (
    <input
      name={name}
      class={clsx(
        'w-full h-11 px-4 py-2.5 text-sm appearance-none border border-gray-300 bg-transparent text-gray-800',
        'dark:border-gray-700 dark:bg-gray-900 dark:text-white/90',
        'focus:outline-hidden focus:ring-3',
        error
          ? 'border-red-300 focus:border-red-300 focus:ring-red-500/20 dark:border-red-800 dark:focus:border-red-800'
          : 'focus:border-teal-300 focus:ring-teal-500/20 dark:focus:border-teal-800',
        className
      )}
      type={type}
      value={value}
      onInput={onInput}
      aria-invalid={!!error}
      {...rest}
    />
  )
}

export default Input
