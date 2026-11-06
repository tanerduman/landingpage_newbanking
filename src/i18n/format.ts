import type { FeatureValue } from '../plans.ts'
import type { Locale, Messages } from './types.ts'

export function localizeFeature(value: FeatureValue, t: Messages, locale: Locale): FeatureValue {
  if (value === true || value === false) return value
  if (value === 'Sınırsız') return t.compare.unlimited
  if (value === '%5 tur') return t.compare.tour
  if (value === '%10 tur + otel') return t.compare.tourHotel
  if (locale !== 'en') return value
  return value
    .replaceAll(' adet/ay', '/mo')
    .replaceAll('/gün', '/day')
    .replaceAll('/ay', '/mo')
}

export function formatMoney(amount: number, locale: Locale) {
  return `${amount.toLocaleString(locale === 'en' ? 'en-GB' : 'tr-TR')} ₺`
}

export function formatFx(rate: number, locale: Locale) {
  return rate.toLocaleString(locale === 'en' ? 'en-GB' : 'tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}
