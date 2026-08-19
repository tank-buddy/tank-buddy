import { render } from 'preact'
import App from './App'
import './style.css'

/**
 * esp-web-tools registers `<esp-web-install-button>` as a side effect of being
 * imported, and reads `navigator.serial` while doing so. Importing it at the top
 * would therefore break any build step that evaluates this module outside a
 * browser; keeping it here, after the app is mounted, also means the element
 * definition never delays first paint.
 *
 * The heavy part is lazy regardless: the 308 kB flash dialog and one stub chunk
 * per chip are dynamic imports, which Vite emits as separate files and the
 * browser fetches when Connect is pressed. The difference from before is that
 * they now come from this origin instead of unpkg, resolved through the
 * lockfile rather than a floating `@10` range -- a CDN hiccup mid-flash used to
 * be able to strand a half-written device.
 */
const mount = document.querySelector('#app')

if (mount !== null) {
  render(<App />, mount)
}

void import('esp-web-tools/dist/web/install-button.js')
