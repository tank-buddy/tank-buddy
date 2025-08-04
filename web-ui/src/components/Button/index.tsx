import clsx from 'clsx'
import type { ButtonPropsInterface } from './types.ts'

const Button = (props: ButtonPropsInterface) => {
  const { type, className, onClick, disabled, children } = props

  return (
    <button
      type={type === undefined ? 'button' : type}
      class={clsx(
        'w-full p-3 text-sm font-medium text-white transition-colors bg-teal-500 hover:bg-teal-600',
        className
      )}
      onClick={() => {
        if (disabled) {
          return
        }

        onClick?.()
      }}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button
