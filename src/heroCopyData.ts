export type HeroText = { tr: string; en: string }

export type HeroCopy = {
  title: HeroText
  lead: HeroText
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
  }
}
