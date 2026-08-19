import { t } from '../../utils/i18n'
import { useTheme } from '../../utils/theme'
import Moon from '../Icon/Moon'
import Sun from '../Icon/Sun'

const ThemeToggle = () => {
  const [theme, toggle] = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      // Names the destination, not the current state -- that is what the button
      // does when pressed.
      aria-label={t(dark ? 'action.use-light-theme' : 'action.use-dark-theme')}
      class="flex size-9 items-center justify-center rounded-full text-label-secondary active:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      onClick={toggle}
    >
      {dark ? (
        <Moon className="size-[22px]" />
      ) : (
        <Sun className="size-[22px]" />
      )}
    </button>
  )
}

export default ThemeToggle
