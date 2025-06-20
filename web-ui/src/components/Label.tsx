import type { ComponentChildren } from 'preact'
import cn from '../utils/cn'

interface LabelPropsInterface {
  forName: string
  className?: string
  children: ComponentChildren
}

const Label = (props: LabelPropsInterface) => {
  const { forName, className, children } = props
  return (
    <label
      className={cn(
        'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400',
        className
      )}
      for={forName}
    >
      {children}
    </label>
  )
}

export default Label
