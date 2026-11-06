import { en } from './en.ts'
import { tr } from './tr.ts'
import type { Locale, Messages } from './types.ts'

export type { Locale, Messages }

const KEY = 'aure-lang'

export const catalogs: Record<Locale, Messages> = { tr, en }

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'tr' || value === 'en'
}

export function readLocale(): Locale {
  try {
    const saved = localStorage.getItem(KEY)
    if (isLocale(saved)) return saved
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : ''
  if (nav.toLowerCase().startsWith('tr')) return 'tr'
  return 'tr'
}

export function writeLocale(locale: Locale) {
  try {
    localStorage.setItem(KEY, locale)
  } catch {
    /* ignore */
  }
  document.documentElement.lang = catalogs[locale].htmlLang
  document.title = catalogs[locale].title
  const meta = document.querySelector('meta[name="description"]')
  if (meta) meta.setAttribute('content', catalogs[locale].description)
}

export function messages(locale: Locale): Messages {
  return catalogs[locale]
}
