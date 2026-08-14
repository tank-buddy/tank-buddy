import { render } from 'preact'
import App from './App'
import './index.css'
import { language } from './utils/i18n'

const appElement = document.getElementById('app')

if (appElement === null) {
  throw new Error('#app is missing from index.html')
}

// The document is served with a fixed lang attribute; correct it to whatever
// the UI actually rendered so screen readers use the right voice.
document.documentElement.lang = language

// Guarded by DEV so the worker is tree-shaken out of the production bundle.
const start = async () => {
  if (import.meta.env.DEV) {
    const { worker } = await import('../mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  render(<App />, appElement)
}

void start()
