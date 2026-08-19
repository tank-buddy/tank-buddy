import { useCallback, useState } from 'preact/hooks'

/** Mirrored by the inline script in index.html; keep both in sync. */
export const THEME_STORAGE_KEY = 'tank-buddy-theme'

export type Theme = 'light' | 'dark'

/** Matches --surface-sunken in index.css so the iOS status bar blends in. */
const STATUS_BAR_COLOR: Record<Theme, string> = {
  light: '#f2f2f7',
  dark: '#000000',
}

const isTheme = (value: unknown): value is Theme =>
  value === 'light' || value === 'dark'

const systemTheme = (): Theme =>
  matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

/**
 * The attribute on <html> is the source of truth, not this module: the inline
 * script in index.html has already resolved storage and system preference
 * before the bundle runs, so reading it back avoids disagreeing with what the
 * user is looking at.
 */
export const getTheme = (): Theme => {
  const current = document.documentElement.dataset.theme

  return isTheme(current) ? current : systemTheme()
}

export const setTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme

  // Drives the status-bar tint of the home-screen app, which is the only way to
  // colour it without a service worker.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', STATUS_BAR_COLOR[theme])

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private browsing can refuse to store; the theme still holds for this visit.
  }
}

/** Returns the active theme and a toggle, in that order. */
export const useTheme = (): [Theme, () => void] => {
  const [theme, setCurrent] = useState<Theme>(getTheme)

  const toggle = useCallback(() => {
    // Read from the DOM rather than from `theme`, so the callback needs no
    // dependency and cannot act on a stale value.
    const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'

    setTheme(next)
    setCurrent(next)
  }, [])

  return [theme, toggle]
}
