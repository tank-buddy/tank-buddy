import type { ComponentChildren } from 'preact'

export type Translations = Record<string, string>

export type TranslateFN = (key: string, vars?: Record<string, string>) => string

export interface IntlContextValueInterface {
  t: TranslateFN
  locale: string
}

export interface IntlProviderPropsInterface {
  locale: string
  messages: Translations
  children: ComponentChildren
}
