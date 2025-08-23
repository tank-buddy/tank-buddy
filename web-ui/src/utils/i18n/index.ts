const lang = (navigator.language || 'en').split('-')[0]

export const init = async () => {
  try {
    const mod = await import(`../../lang/${lang}.json`)
    window.__t = mod.default
  } catch {
    const fallback = await import('../../lang/en.json')
    window.__t = fallback.default
  }
}

export const t = (key: string, vars?: Record<string, string>): string => {
  let text = window.__t[key] ?? key

  if (vars !== undefined) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{${k}}`, 'g'), v)
    })
  }

  return text
}
