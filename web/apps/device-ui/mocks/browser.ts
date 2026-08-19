import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// One worker for both the dev server and the Vitest browser-mode suite, so the
// mocked API cannot drift between the two.
export const worker = setupWorker(...handlers)
