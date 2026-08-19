interface SwitchProps {
  name: string
  checked: boolean
  testId?: string
  onChange: (checked: boolean) => void
}

// Apple's metrics, in points: a 51x31 track with a 27 knob inset by 2, which
// leaves exactly 20 of travel.
const TRACK =
  'h-[31px] w-[51px] rounded-full bg-track transition-colors duration-200 peer-checked:bg-brand'
const KNOB =
  'pointer-events-none absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white ' +
  'shadow-knob transition-transform duration-200 peer-checked:translate-x-[20px]'
const FOCUS =
  'peer-focus-visible:ring-2 peer-focus-visible:ring-brand/60 ' +
  'peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface'

/**
 * The visible parts are two decorative spans driven by `peer-checked`, but the
 * control itself is a real checkbox rather than a styled button: that keeps the
 * implicit association with the surrounding Row label intact, so the whole row
 * stays a hit target and `getByLabelText` keeps finding it.
 *
 * The input is stretched over the track and made transparent instead of being
 * hidden with `sr-only`: a 1px clipped element is not reliably clickable, so a
 * visually hidden input would need force-clicking in tests and would drift from
 * how a finger actually hits it.
 */
const Switch = (props: SwitchProps) => {
  const { name, checked, testId, onChange } = props

  return (
    <span class="relative inline-flex shrink-0">
      <input
        type="checkbox"
        role="switch"
        name={name}
        checked={checked}
        data-testid={testId}
        class="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0"
        onChange={(event) => {
          onChange(event.currentTarget.checked)
        }}
      />
      <span aria-hidden="true" class={`${TRACK} ${FOCUS}`} />
      <span aria-hidden="true" class={KNOB} />
    </span>
  )
}

export default Switch
