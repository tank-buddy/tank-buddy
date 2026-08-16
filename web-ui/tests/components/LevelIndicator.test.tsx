import { http, HttpResponse } from 'msw'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-preact'
import { page } from 'vitest/browser'
import { worker } from '../../mocks/browser'
import { NO_READING } from '../../mocks/fixtures'
import LevelIndicator from '../../src/components/LevelIndicator'

test('shows the level immediately, without waiting for the poll interval', async () => {
  // Regression: the first render used to sit at 0 % for a full 5 s because the
  // effect only scheduled an interval and never fetched up front.
  render(<LevelIndicator />)

  await expect
    .element(page.getByTestId('level-value'))
    .toHaveTextContent('75 %')
})

test('reports the distance to the water surface', async () => {
  render(<LevelIndicator />)

  await expect
    .element(page.getByTestId('level-distance'))
    .toHaveTextContent('250 mm')
})

test('draws the water at the reported percentage', async () => {
  render(<LevelIndicator />)

  const fill = page.getByTestId('level-fill')
  await expect.element(fill).toBeInTheDocument()

  // Asserted on the inline style rather than on the rendered box, because the
  // height animates and the final value is what the reading means.
  expect((fill.element() as HTMLElement).style.height).toBe('75%')
})

test('renders a dash while the device has no reading yet', async () => {
  worker.use(http.get('/api/level', () => HttpResponse.json(NO_READING)))

  render(<LevelIndicator />)

  await expect.element(page.getByTestId('level-value')).toHaveTextContent('–')
})

test('draws no water at all until there is a reading', async () => {
  worker.use(http.get('/api/level', () => HttpResponse.json(NO_READING)))

  render(<LevelIndicator />)

  // The timestamp row only appears once a poll succeeded, so waiting for it
  // proves the absent water is a decision and not just an unfinished fetch.
  await expect.element(page.getByTestId('level-updated')).toBeInTheDocument()
  await expect.element(page.getByTestId('level-fill')).not.toBeInTheDocument()
})

test('surfaces a failure instead of silently showing a stale value', async () => {
  worker.use(
    http.get('/api/level', () => new HttpResponse(null, { status: 500 }))
  )

  render(<LevelIndicator />)

  await expect.element(page.getByRole('status')).toBeInTheDocument()
})

test('exposes the level to assistive technology', async () => {
  // The fill bar is the entire point of the app; as a bare div with a height
  // style it was invisible to screen readers.
  render(<LevelIndicator />)

  const meter = page.getByRole('meter')

  await expect.element(meter).toHaveAttribute('aria-valuenow', '75')
  await expect.element(meter).toHaveAttribute('aria-valuemin', '0')
  await expect.element(meter).toHaveAttribute('aria-valuemax', '100')
})
