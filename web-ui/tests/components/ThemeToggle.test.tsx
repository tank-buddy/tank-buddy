import { beforeEach, expect, test } from 'vitest'
import { render } from 'vitest-browser-preact'
import { page } from 'vitest/browser'
import ThemeToggle from '../../src/components/ThemeToggle'
import { THEME_STORAGE_KEY } from '../../src/utils/theme'

beforeEach(() => {
  // localStorage outlives a single test file, and the attribute is global state.
  localStorage.removeItem(THEME_STORAGE_KEY)
  document.documentElement.dataset.theme = 'light'
})

test('switches the document theme and remembers the choice', async () => {
  render(<ThemeToggle />)

  await page.getByTestId('theme-toggle').click()

  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
})

test('switches back', async () => {
  render(<ThemeToggle />)

  await page.getByTestId('theme-toggle').click()
  await page.getByTestId('theme-toggle').click()

  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
})

test('names the appearance it will switch to, not the current one', async () => {
  render(<ThemeToggle />)

  await expect
    .element(page.getByTestId('theme-toggle'))
    .toHaveAttribute('aria-label', 'Use dark appearance')
})

test('keeps the status-bar colour in sync', async () => {
  // The only way to tint the iOS status bar of the home-screen app, and easy to
  // lose because nothing on the page looks wrong when it is missing.
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = '#f2f2f7'
  document.head.append(meta)

  render(<ThemeToggle />)
  await page.getByTestId('theme-toggle').click()

  expect(meta.content).toBe('#000000')

  meta.remove()
})
