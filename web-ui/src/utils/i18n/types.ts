declare global {
  interface Window {
    __t: Translations
  }
}

export type Translations = Record<string, string>

export type TranslateFN = (key: string, vars?: Record<string, string>) => string
