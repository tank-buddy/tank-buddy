import de from '../../lang/de.json'
import en from '../../lang/en.json'

const FALLBACK_LANGUAGE = 'en'

// Imported statically rather than through a dynamic template import. Both
// language files are flashed onto the device either way, so splitting them
// saves nothing on the constrained side -- it only costs an extra round trip
// to a single-threaded HTTP server before the first paint. Static imports also
// make `t()` safe to call at module scope, which the async variant was not.
const TRANSLATIONS: Record<string, Record<string, string>> = { de, en }

const detectLanguage = (): string => {
  const [language] = navigator.language.split('-')

  return language in TRANSLATIONS ? language : FALLBACK_LANGUAGE
}

export const language = detectLanguage()

const strings = TRANSLATIONS[language] ?? en

export const t = (key: string): string => strings[key] ?? key
