import { http, HttpResponse } from 'msw'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-preact'
import { page } from 'vitest/browser'
import { worker } from '../../mocks/browser'
import { RELEASE_API, RELEASE_VERSION } from '../../mocks/handlers'
import UpdatePanel from '../../src/components/UpdatePanel'
import { installedVersion } from '../../src/utils/update'

test('shows which version is running', async () => {
  render(<UpdatePanel />)

  await expect
    .element(page.getByTestId('row-installed-version'))
    .toHaveTextContent(installedVersion)
})

test('reports nothing to do when the release is what is running', async () => {
  worker.use(
    http.get(RELEASE_API, () =>
      HttpResponse.json({
        tag_name: installedVersion,
        assets: [
          {
            name: 'web-ui.json',
            browser_download_url: 'https://example.test/web-ui.json',
          },
        ],
      })
    )
  )
  render(<UpdatePanel />)

  await page.getByTestId('update-action').click()

  await expect.element(page.getByRole('status')).toBeInTheDocument()
  await expect
    .element(page.getByTestId('row-available-version'))
    .not.toBeInTheDocument()
})

test('uploads every file of the release once confirmed', async () => {
  const uploaded: string[] = []
  let committed = false

  worker.use(
    http.put('/api/web-ui/*', ({ request }) => {
      uploaded.push(new URL(request.url).pathname)

      return HttpResponse.json({ success: true })
    }),
    http.post('/api/web-ui/commit', () => {
      committed = true

      return HttpResponse.json({ success: true })
    })
  )
  render(<UpdatePanel />)

  await page.getByTestId('update-action').click()
  await expect
    .element(page.getByTestId('row-available-version'))
    .toHaveTextContent(RELEASE_VERSION)

  await page.getByTestId('update-action').click()
  await page.getByTestId('confirm-accept').click()

  await vi.waitFor(() => {
    expect(committed).toBe(true)
  })
  expect(uploaded).toEqual([
    '/api/web-ui/index.html.gz',
    '/api/web-ui/assets/index-abc123.js.gz',
  ])
})

test('an update can be called off before anything is written', async () => {
  const uploaded: string[] = []

  worker.use(
    http.put('/api/web-ui/*', ({ request }) => {
      uploaded.push(new URL(request.url).pathname)

      return HttpResponse.json({ success: true })
    })
  )
  render(<UpdatePanel />)

  await page.getByTestId('update-action').click()
  await expect
    .element(page.getByTestId('row-available-version'))
    .toBeInTheDocument()

  await page.getByTestId('update-action').click()
  await page.getByTestId('confirm-cancel').click()

  await expect
    .element(page.getByTestId('confirm-sheet'))
    .not.toBeInTheDocument()
  expect(uploaded).toEqual([])
})

test('a failed lookup is reported instead of looking up to date', async () => {
  worker.use(
    http.get(RELEASE_API, () => new HttpResponse(null, { status: 503 }))
  )
  render(<UpdatePanel />)

  await page.getByTestId('update-action').click()

  await expect.element(page.getByRole('alert')).toBeInTheDocument()
})
