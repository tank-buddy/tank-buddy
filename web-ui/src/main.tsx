import { render } from 'preact'
import App from './App'

// biome-ignore lint/style/noNonNullAssertion: <explanation>
render(<App />, document.getElementById('app')!)
