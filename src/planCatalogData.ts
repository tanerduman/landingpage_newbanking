export const PLAN_IDS = ['account', 'standard', 'plus', 'premium'] as const
export type PlanColumn = (typeof PLAN_IDS)[number]
export type PlanGroup = 'bank' | 'travel' | 'brand'

export type PlanText = { tr: string; en: string }

export type PlanContentRow = {
  id: string
  group: PlanGroup
  labelTr: string
  labelEn: string
  values: Record<PlanColumn, PlanText>
}

export type PlanCatalog = {
  showPrices: boolean
  prices: Record<PlanColumn, PlanText>
  rows: PlanContentRow[]
}

const same = (text: string): PlanText => ({ tr: text, en: text })
const dash: PlanText = same('—')
const yes: PlanText = same('✓')

function row(
  id: string,
  group: PlanGroup,
  labelTr: string,
  labelEn: string,
  values: [PlanText, PlanText, PlanText, PlanText],
): PlanContentRow {
  return {
    id,
    group,
    labelTr,
    labelEn,
    values: {
      account: values[0],
      standard: values[1],
      plus: values[2],
      premium: values[3],
    },
  }
}

export function defaultPlanCatalog(): PlanCatalog {
  return {
    showPrices: true,
    prices: {
      account: same('0 ₺'),
      standard: same('149 ₺'),
      plus: same('299 ₺'),
      premium: same('499 ₺'),
    },
    rows: [
      row('overnight', 'bank', 'Otomatik gecelik faiz', 'Automatic overnight interest', [
        same('%34'),
        same('%34,5'),
        same('%34,75'),
        same('%35'),
      ]),
      row('eft', 'bank', 'Ücretsiz EFT / FAST', 'Free EFT / FAST', [
        dash,
        { tr: '5 adet/ay', en: '5/mo' },
        { tr: '10 adet/ay', en: '10/mo' },
        { tr: '15 adet/ay', en: '15/mo' },
      ]),
      row('atm', 'bank', 'Ücretsiz ATM çekimi', 'Fee-free ATM withdrawals', [
        { tr: '15.000 TL/gün', en: '15.000 TL/day' },
        { tr: '20.000 TL/gün', en: '20.000 TL/day' },
        { tr: '25.000 TL/gün', en: '25.000 TL/day' },
        { tr: '30.000 TL/gün', en: '30.000 TL/day' },
      ]),
      row('fxLimit', 'bank', 'Aylık döviz alım-satım limiti', 'Monthly FX trading limit', [
        dash,
        { tr: '1.500 €/ay', en: '1.500 €/mo' },
        { tr: '5.000 €/ay', en: '5.000 €/mo' },
        { tr: '10.000 €/ay', en: '10.000 €/mo' },
      ]),
      row('fxFee', 'bank', 'Döviz komisyonu (limit içi)', 'FX fee (within limit)', [
        same('%4'),
        same('%2'),
        same('%1'),
        same('%0,5'),
      ]),
      row('fxFeeOver', 'bank', 'Döviz komisyonu (limit üzeri)', 'FX fee (above the limit)', [
        same('%4'),
        same('%4'),
        same('%4'),
        same('%4'),
      ]),
      row('fxSellFee', 'bank', 'Döviz satış makası', 'FX sell spread', [
        same('%2,5'),
        same('%1,5'),
        same('%1'),
        same('%0,5'),
      ]),
      row('goldSpread', 'bank', 'Uygulamadan gram altın makası', 'In-app gram gold spread', [
        same('%4'),
        same('%2'),
        same('%1'),
        same('%0,5'),
      ]),
      row('stock', 'bank', 'Hisse / yatırım komisyonu', 'Stock / investment commission', [
        same('%0,20'),
        { tr: '%0', en: '0%' },
        { tr: '%0', en: '0%' },
        { tr: '%0', en: '0%' },
      ]),
      row('liveData', 'bank', 'Canlı borsa verisi', 'Live market data', [
        { tr: 'Gecikmeli', en: 'Delayed' },
        { tr: 'Ücretsiz canlı', en: 'Free live data' },
        { tr: 'Ücretsiz canlı', en: 'Free live data' },
        { tr: 'Ücretsiz canlı', en: 'Free live data' },
      ]),
      row('installments', 'travel', 'Peşin fiyatına taksit hakkı', 'Cash-price instalments', [
        dash,
        { tr: '3 taksit', en: '3 instalments' },
        { tr: '3 ve 6 taksit', en: '3 and 6 instalments' },
        { tr: '3 ve 6 taksit', en: '3 and 6 instalments' },
      ]),
      row('cashback', 'travel', 'Yurt dışı harcamada nakit iade', 'Cashback on spend abroad', [
        dash,
        dash,
        same('%10'),
        same('%10'),
      ]),
      row('autoCampaign', 'travel', 'Taahhütsüz otomatik kampanya katılımı', 'Auto offer opt-in, no lock-in', [
        dash,
        yes,
        yes,
        yes,
      ]),
      row('support', 'travel', 'Müşteri desteği / VIP şube önceliği', 'Support / VIP branch priority', [
        { tr: 'Sıralı insan desteği', en: 'Queued human support' },
        { tr: 'Sıralı insan desteği', en: 'Queued human support' },
        { tr: 'Doğrudan temsilci', en: 'Direct agent' },
        { tr: 'VIP şube sırası', en: 'VIP branch priority' },
      ]),
      row('setur', 'brand', 'Setur', 'Setur', [
        dash,
        dash,
        { tr: '%5 tur', en: '5% tours' },
        { tr: '%10 tur + otel', en: '10% tours + hotels' },
      ]),
      row('migros', 'brand', 'Migros mağaza', 'Migros stores', [dash, same('%2'), same('%4'), same('%7')]),
      row('migrosOnline', 'brand', 'Migros Sanal Market', 'Migros Sanal Market', [
        dash,
        same('%2'),
        same('%5'),
        same('%8'),
      ]),
      row('divan', 'brand', 'Divan Pastanesi', 'Divan Pastanesi', [dash, dash, same('%10'), same('%15')]),
      row('neo', 'brand', 'Neo Skola', 'Neo Skola', [dash, yes, yes, yes]),
      row('koctas', 'brand', 'Koçtaş', 'Koçtaş', [dash, same('%5'), same('%7,5'), same('%10')]),
    ],
  }
}
