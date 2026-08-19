interface SegmentedControlProps {
  name: string
  /** Accessible name for the group; the visible label sits in the Row. */
  label: string
  options: Record<string, string>
  value: string
  testId?: string
  onChange: (value: string) => void
}

const SEGMENT =
  'relative flex-1 cursor-pointer rounded-[7px] py-1 text-center text-[13px] ' +
  'transition-opacity active:opacity-60'

// Weight and label colour carry the selection as well as the pill does, so the
// state does not rest on a fill difference alone.
const SEGMENT_LABEL =
  'font-medium text-label-secondary peer-checked:font-semibold peer-checked:text-label ' +
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-brand'

const SegmentedControl = (props: SegmentedControlProps) => {
  const { name, label, options, value, testId, onChange } = props

  const values = Object.keys(options)
  const index = values.indexOf(value)

  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
      class="relative flex rounded-[9px] bg-fill p-0.5"
    >
      {/* One sliding pill rather than a background per segment: the transform is
          a multiple of its own width, so it needs no measurement. */}
      {index !== -1 && (
        <span
          aria-hidden="true"
          class="absolute inset-y-0.5 left-0.5 rounded-[7px] bg-segment shadow-sm transition-transform duration-200 motion-reduce:transition-none"
          style={{
            width: `calc((100% - 0.25rem) / ${values.length})`,
            transform: `translateX(${index * 100}%)`,
          }}
        />
      )}

      {Object.entries(options).map(([optionValue, optionLabel]) => (
        <label key={optionValue} class={SEGMENT}>
          {/* Stretched and transparent rather than `sr-only`, so the whole
              segment is the hit target for both a finger and a test click. */}
          <input
            type="radio"
            name={name}
            value={optionValue}
            checked={optionValue === value}
            class="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0"
            onChange={() => {
              onChange(optionValue)
            }}
          />
          <span class={SEGMENT_LABEL}>{optionLabel}</span>
        </label>
      ))}
    </div>
  )
}

export default SegmentedControl
