import clsx from 'clsx'
import useLocation from '../../hooks/useLocation'
import type { NavigationItemPropsInterface } from './types.ts'

const NavigationItem = (props: NavigationItemPropsInterface) => {
  const { path, children } = props
  const { path: currentPath } = useLocation()

  return (
    <a
      href={path}
      className={clsx(
        'flex flex-col items-center p-1',
        currentPath === path && 'text-teal-500',
        currentPath !== path && 'text-gray-800 dark:text-white/90'
      )}
    >
      {children}
    </a>
  )
}

export default NavigationItem
