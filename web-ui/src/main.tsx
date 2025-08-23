import { render } from 'preact'
import './index.css'
import App from './App.tsx'
import { init } from './utils/i18n'

const appElement = document.getElementById('app')

if (appElement !== null) {
  init().then(() => render(<App />, appElement))
}
