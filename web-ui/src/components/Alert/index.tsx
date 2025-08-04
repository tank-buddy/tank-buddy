import clsx from 'clsx'
import type { AlertPropsInterface } from './types.ts'

const Alert = (props: AlertPropsInterface) => {
  const { type, children } = props

  return (
    <div
      class={clsx(
        'border  p-4 text-sm font-medium mb-5 text-gray-800',
        'dark:border-green-500/30 dark:bg-green-500/15 dark:text-white/90',
        {
          'border-green-500 bg-green-50 dark:border-green-500/30 dark:bg-green-500/15':
            type === 'success',
          'border-yellow-500 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-500/15':
            type === 'warning',
          'border-red-500 bg-red-50 dark:border-red-500/30 dark:bg-red-500/15':
            type === 'error',
        }
      )}
    >
      {children}
    </div>
  )
}

export default Alert
