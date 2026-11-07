import type { PlanId } from './waitlist'

export type PlanColumnId = 'account' | PlanId
export type FeatureValue = string | boolean

export const plans: {
  id: PlanId
  name: string
  monthly: number
  waiverSpend: number
  overnight: number
  campaignRate: number
  installmentRate: number
  featured?: boolean
}[] = [
  {
    id: 'standard',
    name: 'Standard',
    monthly: 149,
    waiverSpend: 15_000,
    overnight: 0.34,
    campaignRate: 0.02,
    installmentRate: 0.015,
  },
  {
    id: 'plus',
    name: 'Plus',
    monthly: 299,
    waiverSpend: 30_000,
    overnight: 0.36,
    campaignRate: 0.04,
    installmentRate: 0.025,
    featured: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthly: 499,
    waiverSpend: 50_000,
    overnight: 0.38,
    campaignRate: 0.07,
    installmentRate: 0.03,
    featured: true,
  },
]

export const planColumns: { id: PlanColumnId; name: string; price: string }[] = [
  { id: 'account', name: 'Temel', price: '0 ₺' },
  { id: 'standard', name: 'Standard', price: '149 ₺/ay' },
  { id: 'plus', name: 'Plus', price: '299 ₺/ay' },
  { id: 'premium', name: 'Premium', price: '499 ₺/ay' },
]

/** Worked example: idle cash on a Basic account, same FX mid-rate as the 500 EUR mock. */
export const SAMPLE_IDLE_TRY = 1_000_000
export const SAMPLE_EUR_TRY = 36.42

export const overnightByColumn: Record<PlanColumnId, number> = {
  account: 0.32,
  ...Object.fromEntries(plans.map((plan) => [plan.id, plan.overnight])),
} as Record<PlanColumnId, number>

export const fxFeeByColumn: Record<PlanColumnId, number> = {
  account: 0.0149,
  standard: 0.0075,
  plus: 0.0035,
  premium: 0,
}

/** In-app gram gold. Basic pays 6,450 ₺/g; paid plans quote a tighter spread and Premium pays the mid. */
export const SAMPLE_GOLD_GRAMS = 10
export const SAMPLE_GOLD_TEMEL_TRY = 6_450
export const goldSpreadByColumn: Record<PlanColumnId, number> = {
  account: 0.009,
  standard: 0.004,
  plus: 0.0015,
  premium: 0,
}
export const SAMPLE_GOLD_TRY =
  Math.round((SAMPLE_GOLD_TEMEL_TRY / (1 + goldSpreadByColumn.account)) * 100) / 100

export function monthlyFeeOf(id: PlanColumnId): number {
  if (id === 'account') return 0
  return plans.find((plan) => plan.id === id)?.monthly ?? 0
}

export const comparisonRows: {
  id:
    | 'feeWaiver'
    | 'overnight'
    | 'eft'
    | 'fxLimit'
    | 'fxFee'
    | 'goldSpread'
    | 'stock'
    | 'liveData'
    | 'installments'
    | 'autoCampaign'
    | 'support'
    | 'setur'
    | 'migros'
    | 'migrosOnline'
    | 'divan'
  group: 'bank' | 'travel' | 'brand'
  icon: string
  values: Record<PlanColumnId, FeatureValue>
}[] = [
  {
    id: 'feeWaiver',
    group: 'bank',
    icon: 'save',
    values: { account: 'none', standard: 'waiverStd', plus: 'waiverPlus', premium: 'waiverPrem' },
  },
  {
    id: 'overnight',
    group: 'bank',
    icon: 'save',
    values: { account: '%32', standard: '%34', plus: '%36', premium: '%38' },
  },
  {
    id: 'eft',
    group: 'bank',
    icon: 'send',
    values: { account: 'unlimited0', standard: 'unlimited0', plus: 'unlimited0', premium: 'unlimited0' },
  },
  {
    id: 'fxLimit',
    group: 'bank',
    icon: 'fx',
    values: { account: '250 €/ay', standard: '1.500 €/ay', plus: '5.000 €/ay', premium: 'Sınırsız' },
  },
  {
    id: 'fxFee',
    group: 'bank',
    icon: 'fx',
    values: { account: '%1,49', standard: '%0,75', plus: '%0,35', premium: '%0' },
  },
  {
    id: 'goldSpread',
    group: 'bank',
    icon: 'save',
    values: { account: '%0,90', standard: '%0,40', plus: '%0,15', premium: '%0' },
  },
  {
    id: 'stock',
    group: 'bank',
    icon: 'stock',
    values: { account: '%0,20', standard: 'zeroStock', plus: 'zeroStock', premium: 'zeroStock' },
  },
  {
    id: 'liveData',
    group: 'bank',
    icon: 'stock',
    values: { account: 'delayed', standard: 'live', plus: 'live', premium: 'live' },
  },
  {
    id: 'installments',
    group: 'travel',
    icon: 'card',
    values: { account: false, standard: 'inst3', plus: 'inst36', premium: 'inst36' },
  },
  {
    id: 'autoCampaign',
    group: 'travel',
    icon: 'shop',
    values: { account: false, standard: false, plus: true, premium: true },
  },
  {
    id: 'support',
    group: 'travel',
    icon: 'card',
    values: { account: 'bot', standard: 'bot', plus: 'human', premium: 'vip' },
  },
  {
    id: 'setur',
    group: 'brand',
    icon: 'plane',
    values: { account: false, standard: false, plus: '%5 tur', premium: '%10 tur + otel' },
  },
  {
    id: 'migros',
    group: 'brand',
    icon: 'shop',
    values: { account: false, standard: '%2', plus: '%4', premium: '%7' },
  },
  {
    id: 'migrosOnline',
    group: 'brand',
    icon: 'bag',
    values: { account: false, standard: '%2', plus: '%5', premium: '%8' },
  },
  {
    id: 'divan',
    group: 'brand',
    icon: 'cake',
    values: { account: false, standard: false, plus: '%10', premium: '%15' },
  },
]

export const campaignDetails: {
  id: string
  name: string
  category: string
  summary: string
  how: string
  note: string
  rates: Record<PlanColumnId, FeatureValue>
}[] = [
  {
    id: 'migros',
    name: 'Migros',
    category: 'Market',
    summary: 'Fiziksel Migros mağazalarında kartınla yaptığın alışverişe paket indirimi yansır.',
    how: 'Kampanyalı paketi ekle, AURE kartınla kasada öde. İndirim dönem sonunda ekstra puan veya anlık fiyat farkı olarak işlenir (kurgusal model).',
    note: 'Temel hesapta kapalı. Standard’dan itibaren açılır; oran paketinle yükselir.',
    rates: { account: false, standard: '%2', plus: '%4', premium: '%7' },
  },
  {
    id: 'migros-online',
    name: 'Migros Sanal Market',
    category: 'Market',
    summary: 'Migros Sanal Market siparişlerinde aynı marka işbirliği, online sepete özel oranla geçer.',
    how: 'Sanal Market’te ödeme yöntemi olarak AURE kartını seç. Kampanya yalnızca paketli hesapta ve kampanya döneminde işler.',
    note: 'Standard %2, Plus %5, Premium %8. Mağaza oranından Plus ve Premium’da daha yüksek.',
    rates: { account: false, standard: '%2', plus: '%5', premium: '%8' },
  },
  {
    id: 'divan',
    name: 'Divan Pastanesi',
    category: 'Yiyecek',
    summary: 'Divan Pastanesi mağaza ve seçili noktalarda paket oranında indirim.',
    how: 'Kartınla öde; kasa kampanyayı paketine göre tanır. Plus’ta %10, Premium’da %15.',
    note: 'Standard ve Temel hesapta bu kampanya kapalıdır.',
    rates: { account: false, standard: false, plus: '%10', premium: '%15' },
  },
  {
    id: 'setur',
    name: 'Setur',
    category: 'Seyahat',
    summary: 'Setur tur ve otel rezervasyonlarında paket ayrıcalığı. Plus turda, Premium tur + otelde.',
    how: 'Setur’da ödeme adımında AURE kartı kullan. Tur indirimi Plus’tan, otel avantajı Premium’dan açılır.',
    note: 'Temel ve Standard’da Setur kampanyası yok; yurt dışı nakit iade Plus’tan açılır.',
    rates: { account: false, standard: false, plus: '%5 tur', premium: '%10 tur + otel' },
  },
]
