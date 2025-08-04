import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type {
  IntlContextValueInterface,
  IntlProviderPropsInterface,
} from './types.ts'

const IntlContext = createContext<IntlContextValueInterface | undefined>(
  undefined
)

export const IntlProvider = (props: IntlProviderPropsInterface) => {
  const { locale, messages } = props

  const t = (key: string, vars?: Record<string, string>): string => {
    let text = messages[key] ?? key

    if (vars !== undefined) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), v)
      })
    }

    return text
  }

  return (
    <IntlContext.Provider
      value={{
        t,
        locale,
      }}
    >
      {props.children}
    </IntlContext.Provider>
  )
}

export const useIntl = () => {
  const context = useContext(IntlContext)

  if (context === undefined) {
    throw new Error('useIntl must be used within an IntlProvider')
  }

  return context
}
