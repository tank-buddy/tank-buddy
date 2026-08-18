import { http, HttpResponse } from 'msw'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-preact'
import { page } from 'vitest/browser'
import { worker } from '../../mocks/browser'
import { RELEASE_VERSION } from '../../mocks/handlers'
import UpdatePanel from '../../src/components/UpdatePanel'
import { BUNDLE_URL, installedVersion } from '../../src/utils/update'

test('shows which version is running', async () => {
  render(<UpdatePanel />)

  await expect
    .element(page.getByTestId('row-installed-version'))
    .toHaveTextContent(installedVersion)
})

test('reports nothing to do when the published bundle is what is running', async () => {
  worker.use(
    http.get(BUNDLE_URL, () =>
      HttpResponse.json({ version: installedVersion, files: {} })
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

test('the bundle comes from the deploy site, never from github', async () => {
  // The device serves this page over plain HTTP on the LAN, so every github.com
  // fetch is cross-origin -- and github sends no Access-Control-Allow-Origin,
  // neither on the release download nor on the redirect target it hands out. The
  // block itself is invisible here, because the service worker answers before
  // CORS would apply, so the observable defect is that the request is made at
  // all. GitHub Pages does send the header, which is why the deploy site works.
  const fromGithub: string[] = []
  const spy = ({ request }: { request: Request }) => {
    fromGithub.push(request.url)

    return HttpResponse.json({
      tag_name: RELEASE_VERSION,
      version: RELEASE_VERSION,
      assets: [{ name: 'web-ui.json', browser_download_url: BUNDLE_URL }],
      files: {},
    })
  }

  worker.use(
    http.get('https://api.github.com/*', spy),
    http.get('https://github.com/*', spy)
  )
  render(<UpdatePanel />)

  await page.getByTestId('update-action').click()
  await expect
    .element(page.getByTestId('row-available-version'))
    .toHaveTextContent(RELEASE_VERSION)

  expect(fromGithub).toEqual([])
})

test('a failed lookup is reported instead of looking up to date', async () => {
  worker.use(
    http.get(BUNDLE_URL, () => new HttpResponse(null, { status: 503 }))
  )
  render(<UpdatePanel />)

  await page.getByTestId('update-action').click()

  await expect.element(page.getByRole('alert')).toBeInTheDocument()
})
