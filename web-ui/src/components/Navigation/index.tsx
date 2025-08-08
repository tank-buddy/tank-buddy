import { useIntl } from '../../providers/IntlProvider'
import HomeIcon from '../Icon/Home'
import SettingsIcon from '../Icon/Settings'
import NavigationItem from '../NavigationItem'
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
  const { t } = useIntl()

  return (
    <nav className="flex-none h-16 border-t border-gray-200 dark:border-gray-800">
      <ul className="flex h-full items-center justify-evenly list-none">
        {links.map((link, index) => {
          const { label, path, icon } = link

          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: false positive
            <li key={index}>
              <NavigationItem path={path}>
                <div className="h-8">{icon}</div>
                <div className="text-sm">{label(t)}</div>
              </NavigationItem>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default Navigation
