import type { ComponentChildren } from 'preact'

type AlertType = 'success' | 'warning' | 'error'

interface AlertProps {
  type: AlertType
  children: ComponentChildren
}

// A lookup map rather than a conditional class list, because the previous
// version leaked the green variant into the unconditional segment. Only the tint
// varies now: the message itself stays on the primary label colour, since the
// system tints are far too light to read as text on their own backgrounds.
const TONES: Record<AlertType, string> = {
  success: 'bg-success/15',
  warning: 'bg-warning/20',
  error: 'bg-destructive/15',
}

const Alert = (props: AlertProps) => {
  const { type, children } = props

  return (
    <div
      // Errors interrupt; success and warnings are announced politely.
      role={type === 'error' ? 'alert' : 'status'}
      data-testid={`alert-${type}`}
      class={`mb-4 rounded-xl px-4 py-3 text-[15px] leading-snug text-label ${TONES[type]}`}
    >
      {children}
    </div>
  )
}

export default Alert
