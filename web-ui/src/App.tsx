import LevelIndicator from './components/LevelIndicator'
import NavBar from './components/NavBar'
import SettingsPanel from './components/SettingsPanel'

// One page, no router: the fill level is the whole point and the settings are
// the second section rather than a destination. The collapsed disclosure panel
// they used to live in only added a tap on the device this is opened from.
const App = () => (
  <div class="min-h-dvh font-sans">
    <NavBar />

    <main class="mx-auto w-full max-w-120 px-4 pt-6 pb-8">
      <LevelIndicator />
      <SettingsPanel />
    </main>
  </div>
)

export default App
