import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { catalogs, readLocale, writeLocale, type Locale, type Messages } from './index.ts'

const LocaleContext = createContext<{
  locale: Locale
  t: Messages
  setLocale: (next: Locale) => void
}>({
  locale: 'tr',
  t: catalogs.tr,
  setLocale: () => {},
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readLocale())

  useEffect(() => {
    writeLocale(locale)
  }, [locale])

  const value = useMemo(
    () => ({
      locale,
      t: catalogs[locale],
      setLocale: setLocaleState,
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useI18n() {
  return useContext(LocaleContext)
}
