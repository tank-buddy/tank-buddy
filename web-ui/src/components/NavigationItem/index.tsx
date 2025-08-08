import clsx from 'clsx'
import { useBrowserLocation } from 'wouter-preact/use-browser-location'
import type { NavigationItemPropsInterface } from './types.ts'

const NavigationItem = (props: NavigationItemPropsInterface) => {
  const { path, children } = props
  const [location] = useBrowserLocation()

  return (
    <a
      href={path}
      className={clsx(
        'flex flex-col items-center p-1',
        location === path && 'text-teal-500',
        location !== path && 'text-gray-800 dark:text-white/90'
      )}
    >
      {children}
    </a>
  )
}

export default NavigationItem
