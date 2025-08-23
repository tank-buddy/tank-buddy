import { ErrorBoundary, default as lazy } from 'preact-iso/lazy'
import Logo from './components/Icon/Logo'
import Navigation from './components/Navigation'
import useLocation from './hooks/useLocation'
import Home from './routes/Home'

const Settings = lazy(() => import('./routes/Settings'))
const NotFound = lazy(() => import('./routes/NotFound'))

const App = () => {
  const { path } = useLocation()

  return (
    <ErrorBoundary>
      <div className="w-full h-dvh flex flex-col text-gray-400 dark:bg-gray-900 overflow-hidden font-sans justify-center">
        <Logo className="flex-none h-24 p-5 w-auto border-b border-gray-200 dark:border-gray-800" />
        <div className="min-h-0 grow overflow-y-auto">
          {path === '/' && <Home />}
          {path === '/settings' && <Settings />}
          {path !== '/settings' && path !== '/' && <NotFound />}
        </div>
        <Navigation />
      </div>
    </ErrorBoundary>
  )
}

export default App
