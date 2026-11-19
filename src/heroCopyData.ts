export type HeroText = { tr: string; en: string }

export const DEFAULT_FILM_OPACITY = 0.8

export type HeroCopy = {
  title: HeroText
  lead: HeroText
  filmOpacity: number
}

export function filmOpacityOf(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_FILM_OPACITY
  const stepped = Math.round(value * 100) / 100
  if (stepped < 0 || stepped > 1) return DEFAULT_FILM_OPACITY
  return stepped
}

export function defaultHeroCopy(): HeroCopy {
  return {
    title: {
      tr: 'İhtiyacın kadar\nbankacılık.\nSeçtiğin kadar\navantaj.',
      en: 'As much banking\nas you need.\nAs much advantage\nas you choose.',
    },
    lead: {
      tr: 'Sürpriz aidat ve gizli komisyon olmadan transferi, yatırımı ve alışverişi tek cüzdanda birleştiren yeni nesil bankacılık. Seçtiğin aylık paketle vadesiz parana gecelik faiz, paketine göre daralan makas, otomatik kampanya ve bekletmeyen canlı müşteri temsilcisi ayrıcalığını açarsın. Şimdilik yalnızca talep alıyoruz.',
      en: 'Next-generation banking that puts transfers, investing and shopping in one wallet, without surprise fees or hidden commission. The monthly plan you choose opens overnight interest on demand balances, a spread that narrows with the plan, automatic offers, and a live representative who does not keep you waiting. For now we only take requests.',
    },
    filmOpacity: DEFAULT_FILM_OPACITY,
  }
}
