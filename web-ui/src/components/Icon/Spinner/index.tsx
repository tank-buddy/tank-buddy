import type { SpinnerPropsInterface } from './types.ts'

const Spinner = (props: SpinnerPropsInterface) => {
  const { className } = props

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: false positive
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1"
      stroke-linecap="round"
      stroke-linejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

export default Spinner
