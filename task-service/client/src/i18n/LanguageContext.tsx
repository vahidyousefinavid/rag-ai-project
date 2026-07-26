import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type Locale, translations } from './index'

type AnyTranslation = typeof translations[Locale]

interface LanguageContextType {
  locale: Locale
  t: AnyTranslation
  setLocale: (locale: Locale) => void
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'fa',
  t: translations['fa'] as AnyTranslation,
  setLocale: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return (localStorage.getItem('app-locale') as Locale) || 'fa'
  })

  const setLocale = (l: Locale) => {
    localStorage.setItem('app-locale', l)
    setLocaleState(l)
  }

  const t = translations[locale]

  useEffect(() => {
    document.documentElement.dir = t.dir
    document.documentElement.lang = locale
  }, [locale, t.dir])

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
