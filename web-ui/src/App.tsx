import { LocationProvider, Router, Route } from 'preact-iso/router'
import { default as lazy, ErrorBoundary } from 'preact-iso/lazy'
import Home from './routes/Home'
import Navigation from './components/Navigation'

const Settings = lazy(() => import('./routes/Settings'))

const App = () => {
  return (
    <LocationProvider>
      <ErrorBoundary>
        <div className="w-full h-screen flex flex-col text-gray-400 dark:bg-gray-900 overflow-hidden font-sans">
          <div className="flex-1 overflow-y-auto">
            <Router>
              <Route path="/" component={Home} />
              <Route path="/settings" component={Settings} />
            </Router>
          </div>
          <Navigation />
        </div>
      </ErrorBoundary>
    </LocationProvider>
  )
}

export default App
