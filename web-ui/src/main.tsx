import { render } from 'preact'
import './index.css'
import App from './App.tsx'

const appElement = document.getElementById('app')

if (appElement !== null) {
  render(<App />, appElement)
}
