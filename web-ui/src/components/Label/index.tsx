import clsx from 'clsx'
import type { LabelPropsInterface } from './types.ts'

const Label = (props: LabelPropsInterface) => {
  const { className, children } = props

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: false positive
    <label
      class={clsx(
        'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400',
        className
      )}
    >
      {children}
    </label>
  )
}

export default Label
