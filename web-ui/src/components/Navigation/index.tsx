import clsx from 'clsx'
import { useLocation } from 'preact-iso'
import HomeIcon from '../../assets/home.svg?react'
import SettingsIcon from '../../assets/settings.svg?react'
import { useIntl } from '../../providers/IntlProvider'
import type { LinkInterface } from './types.ts'

const links: LinkInterface[] = [
  {
    label: (t) => t('navigation.home'),
    path: '/',
    icon: <HomeIcon className="h-full" />,
  },
  {
    label: (t) => t('navigation.settings'),
    path: '/settings',
    icon: <SettingsIcon className="h-full" />,
  },
]

const Navigation = () => {
  const { path: currentPath } = useLocation()
  const { t } = useIntl()

  return (
    <nav className="flex-none h-16 border-t border-gray-200 dark:border-gray-800">
      <ul className="flex h-full items-center justify-evenly list-none">
        {links.map((link, index) => {
          const { label, path, icon } = link

          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: false positive
            <li key={index}>
              <a
                href={path}
                className={clsx(
                  'flex flex-col items-center p-1',
                  path === currentPath && 'text-teal-500',
                  path !== currentPath && 'text-gray-800 dark:text-white/90'
                )}
              >
                <div className="h-8">{icon}</div>
                <div className="text-sm">{label(t)}</div>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default Navigation
