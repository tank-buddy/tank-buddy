import type { ComponentChildren } from 'preact'

type ButtonVariant = 'primary' | 'plain'

interface ButtonProps {
  disabled?: boolean
  type?: 'submit' | 'button' | 'reset'
  variant?: ButtonVariant
  testId?: string
  children?: ComponentChildren
  onClick?: () => void
}

// `accent` rather than `brand`: white on the brand teal is only 2.6:1.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white',
  plain: 'bg-fill text-label',
}

const BASE =
  'flex h-12 w-full items-center justify-center rounded-xl text-[17px] ' +
  // A pressed state instead of a hover state: this is a phone.
  'font-semibold transition-opacity active:opacity-70 ' +
  // Greyed out rather than faded: an opacity-dimmed button sitting on the
  // translucent save bar let the form text behind it show through the label.
  'disabled:bg-fill disabled:text-label-tertiary ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const Button = (props: ButtonProps) => {
  const {
    type = 'button',
    variant = 'primary',
    testId,
    onClick,
    disabled,
    children,
  } = props

  return (
    <button
      type={type}
      data-testid={testId}
      class={`${BASE} ${VARIANTS[variant]}`}
      // No `if (disabled) return` guard: the attribute below already stops the
      // browser from dispatching the event.
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button
