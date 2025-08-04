import { useEffect, useState } from 'preact/hooks'
import { ErrorBoundary, default as lazy } from 'preact-iso/lazy'
import { LocationProvider, Route, Router } from 'preact-iso/router'
import Logo from './assets/logo.svg?react'
import Navigation from './components/Navigation'
import { IntlProvider } from './providers/IntlProvider'
import type { Translations } from './providers/IntlProvider/types.ts'
import Home from './routes/Home'

const Settings = lazy(() => import('./routes/Settings'))
const NotFound = lazy(() => import('./routes/NotFound'))

const defaultLocale = 'en'

const App = () => {
  const [messages, setMessages] = useState<Translations>({})
  const [locale, setLocale] = useState<string>(defaultLocale)

  useEffect(() => {
    const loadMessages = async () => {
      const userLocale = navigator.language.split('-')[0]
      setLocale(userLocale)

      try {
        const module = await import(`./lang/${userLocale}.json`)
        setMessages(module.default)
      } catch {
        const module = await import(`./lang/${defaultLocale}.json`)
        setMessages(module.default)
      }
    }
    loadMessages()
  }, [])

  return (
    <IntlProvider locale={locale} messages={messages}>
      <LocationProvider>
        <ErrorBoundary>
          <div className="w-full h-dvh flex flex-col text-gray-400 dark:bg-gray-900 overflow-hidden font-sans justify-center">
            <Logo className="flex-none h-24 p-5 w-auto border-b border-gray-200 dark:border-gray-800" />
            <div className="min-h-0 grow overflow-y-auto">
              <Router>
                <Route path="/" component={Home} />
                <Route path="/settings" component={Settings} />
                <Route default={true} component={NotFound} />
              </Router>
            </div>
            <Navigation />
          </div>
        </ErrorBoundary>
      </LocationProvider>
    </IntlProvider>
  )
}

export default App
