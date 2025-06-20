import type { ComponentChild } from 'preact'
import cn from '../utils/cn'

interface ButtonPropsInterface {
  className?: string
  type?: 'submit' | 'button' | 'reset'
  children?: ComponentChild
  onClick?: () => void
}

const Button = (props: ButtonPropsInterface) => {
  const { className, type = 'button', children, onClick } = props

  return (
    <button
      type={type}
      className={cn(
        'w-full p-3 text-sm font-medium text-white transition-colors bg-teal-500 hover:bg-teal-600',
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default Button
