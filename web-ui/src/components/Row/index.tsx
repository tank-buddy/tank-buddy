import type { ComponentChildren } from 'preact'

interface RowProps {
  label: string
  hint?: string
  tone?: 'default' | 'destructive'
  testId?: string
  /** Read-only detail text on the right. Use instead of `children`. */
  value?: string
  /** Turns the row into a button. */
  onClick?: () => void
  disabled?: boolean
  /**
   * Puts the control on its own line below the label, and switches the wrapper
   * from `<label>` to `<div>`: a control *group* must not sit inside one label,
   * because tapping the text would then activate its first radio.
   */
  stacked?: boolean
  children?: ComponentChildren
}

const BASE =
  'relative flex min-h-11 w-full gap-4 px-4 py-2.5 text-left text-[17px] ' +
  // iOS insets the hairline from the left rather than running it edge to edge.
  // `last:` resolves correctly because a Row is always a direct child of Card.
  'after:absolute after:right-0 after:bottom-0 after:left-4 after:h-px ' +
  'after:bg-separator last:after:hidden'

/**
 * One line of a grouped list: label (plus optional hint) on the left, control or
 * detail value on the right.
 *
 * Which element wraps the row follows from which prop was used, so a row is
 * never a `<label>` without a control inside it to be associated with.
 */
const Row = (props: RowProps) => {
  const {
    label,
    hint,
    tone = 'default',
    testId,
    value,
    onClick,
    disabled,
    stacked = false,
    children,
  } = props

  const layout = stacked ? 'flex-col' : 'items-center'

  const content = (
    <>
      {/* Sized to its own text with no flex-1: the control next to it grows into
          whatever is left instead, which is what keeps a long label like
          "MQTT-Topic-Prefix" on one line. */}
      <span class="min-w-0">
        <span
          class={`block ${tone === 'destructive' ? 'text-destructive' : 'text-label'}`}
        >
          {label}
        </span>
        {hint !== undefined && (
          <span class="mt-0.5 block text-[13px] leading-snug text-label-secondary">
            {hint}
          </span>
        )}
      </span>
      {children !== undefined && (
        <span
          class={
            stacked
              ? 'w-full'
              : 'flex min-w-0 flex-1 items-center justify-end gap-2'
          }
        >
          {children}
        </span>
      )}
      {value !== undefined && (
        <span class="ml-auto shrink-0 text-label-secondary tabular-nums">
          {value}
        </span>
      )}
    </>
  )

  if (stacked) {
    return (
      <div class={`${BASE} ${layout}`} data-testid={testId}>
        {content}
      </div>
    )
  }

  if (onClick !== undefined) {
    return (
      <button
        type="button"
        class={`${BASE} ${layout} active:bg-fill disabled:opacity-50`}
        data-testid={testId}
        disabled={disabled}
        onClick={onClick}
      >
        {content}
      </button>
    )
  }

  if (value !== undefined) {
    return (
      <div class={`${BASE} ${layout}`} data-testid={testId}>
        {content}
      </div>
    )
  }

  return (
    <label class={`${BASE} ${layout}`} data-testid={testId}>
      {content}
    </label>
  )
}

export default Row
