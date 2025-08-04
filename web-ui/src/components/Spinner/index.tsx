import clsx from 'clsx'
import WrappedSpinner from '../../assets/spinner.svg?react'
import type { SpinnerPropsInterface } from './types.ts'

const Spinner = (props: SpinnerPropsInterface) => {
  const { className } = props

  return (
    <div class="flex justify-center items-center">
      <WrappedSpinner
        className={clsx(
          'inline text-gray-400 animate-spin fill-teal-500',
          'dark:text-gray-700',
          className
        )}
      />
    </div>
  )
}

export default Spinner
