import { afterAll, afterEach, beforeAll } from 'vitest'
import { worker } from '../mocks/browser'

// The very same worker the dev server uses, so mocks cannot drift between
// development and the test suite.
beforeAll(async () => {
  await worker.start({ onUnhandledRequest: 'error', quiet: true })
})

afterEach(() => {
  worker.resetHandlers()
})

afterAll(() => {
  worker.stop()
})
