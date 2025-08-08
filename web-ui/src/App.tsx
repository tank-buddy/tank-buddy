import { useEffect, useState } from 'preact/hooks'
import { ErrorBoundary, default as lazy } from 'preact-iso/lazy'
import { useBrowserLocation } from 'wouter-preact/use-browser-location'
import Logo from './components/Icon/Logo'
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
  const [location] = useBrowserLocation()

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
      <ErrorBoundary>
        <div className="w-full h-dvh flex flex-col text-gray-400 dark:bg-gray-900 overflow-hidden font-sans justify-center">
          <Logo className="flex-none h-24 p-5 w-auto border-b border-gray-200 dark:border-gray-800" />
          <div className="min-h-0 grow overflow-y-auto">
            {location === '/' && <Home />}
            {location === '/settings' && <Settings />}
            {location !== '/settings' && location !== '/' && <NotFound />}
          </div>
          <Navigation />
        </div>
      </ErrorBoundary>
    </IntlProvider>
  )
}

export default App
