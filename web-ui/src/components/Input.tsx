import { asFormControl, type OnChangeHandler } from '@shelacek/formica'
import cn from '../utils/cn'
import { useRef, useState } from 'preact/hooks'

interface InputPropsInterface {
  name: string
  type?: 'text' | 'number' | 'password' | 'email'
  className?: string
  required?: boolean
  pattern?: string
  value?: string
  disabled?: boolean
  onChange?: OnChangeHandler<InputPropsInterface>
}

const Input = asFormControl((props: InputPropsInterface) => {
  const {
    name,
    type = 'text',
    className,
    required = false,
    pattern,
    value,
    disabled,
    onChange,
  } = props

  const inputRef = useRef<HTMLInputElement>(null)
  const [isValid, setIsValid] = useState<boolean | undefined>(undefined)

  return (
    <input
      ref={inputRef}
      className={cn(
        'w-full h-11 px-4 py-2.5 text-sm appearance-none border border-gray-300 bg-transparent text-gray-800',
        'dark:border-gray-700 dark:bg-gray-900 dark:text-white/90',
        'focus:outline-hidden focus:ring-3 focus:border-teal-300 focus:ring-teal-500/20',
        'dark:focus:border-teal-800',
        isValid === false && 'border-red-300 dark:border-red-300',
        className
      )}
      type={type}
      name={name}
      required={required}
      pattern={pattern}
      value={value}
      disabled={disabled}
      onChange={onChange}
      onBlur={() => setIsValid(inputRef.current?.validity.valid === true)}
      onInvalid={() => setIsValid(false)}
    />
  )
})

export default Input
