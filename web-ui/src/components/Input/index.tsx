import type { InputEventHandler } from 'preact'

interface InputProps {
  type?: 'text' | 'number' | 'password'
  name: string
  value: string
  error?: boolean
  placeholder?: string
  testId?: string
  onInput: InputEventHandler<HTMLInputElement>
}

// Borderless and right-aligned, because the field always sits in the value slot
// of a grouped list row -- the row supplies the frame and the separator.
const BASE =
  'w-full min-w-0 bg-transparent text-right text-[17px] ' +
  'placeholder:text-label-tertiary focus:outline-none'

const Input = (props: InputProps) => {
  const {
    name,
    type = 'text',
    error = false,
    value,
    placeholder,
    testId,
    onInput,
  } = props

  return (
    <input
      name={name}
      data-testid={testId}
      class={`${BASE} ${error ? 'text-destructive' : 'text-label'}`}
      type={type}
      placeholder={placeholder}
      // Without these, iOS capitalises the first letter of an SSID or a broker
      // host and underlines a topic prefix as a spelling mistake.
      autocapitalize="none"
      spellcheck={false}
      inputMode={type === 'number' ? 'numeric' : undefined}
      value={value}
      onInput={onInput}
      aria-invalid={error}
    />
  )
}

export default Input
