import type { PlanId } from './waitlist'

export type PlanColumnId = 'account' | PlanId
export type FeatureValue = string | boolean

export const plans: {
  id: PlanId
  name: string
  monthly: number
  blurb: string
  banking: string[]
  travel: string[]
  campaigns: string[]
  featured?: boolean
}[] = [
  {
    id: 'standard',
    name: 'Standard',
    monthly: 299,
    blurb: 'Günlük bankacılık + ilk market indirimleri.',
    banking: ['ATM 250 €/gün', 'Döviz 1.500 €/ay · %0,75', 'Hisse %0,12', 'Mevduat %34', '8 ücretsiz EFT/ay'],
    travel: ['Yurt dışı kart açık'],
    campaigns: ['Migros %2', 'Migros Sanal Market %2'],
  },
  {
    id: 'plus',
    name: 'Plus',
    monthly: 399,
    blurb: 'Daha yüksek limit, daha iyi faiz, daha fazla kampanya.',
    banking: ['ATM 500 €/gün', 'Döviz 5.000 €/ay · %0,35', 'Hisse %0,08', 'Mevduat %36', '20 ücretsiz EFT/ay'],
    travel: ['Yurt dışı kart', 'Setur %5'],
    campaigns: ['Migros %4', 'Divan Pastanesi %10'],
    featured: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthly: 499,
    blurb: 'Sınırsız döviz, en yüksek faiz ve tam kampanya paketi.',
    banking: ['ATM 1.000 €/gün', 'Döviz sınırsız · %0', 'Hisse %0,04', 'Mevduat %38', 'Sınırsız ücretsiz EFT'],
    travel: ['Yurt dışı kart', 'Setur %10 tur + otel'],
    campaigns: ['Migros %7', 'Divan Pastanesi %15'],
    featured: true,
  },
]

export const planColumns: { id: PlanColumnId; name: string; price: string }[] = [
  { id: 'account', name: 'Paketsiz', price: 'Ücretsiz' },
  { id: 'standard', name: 'Standard', price: '299 ₺/ay' },
  { id: 'plus', name: 'Plus', price: '399 ₺/ay' },
  { id: 'premium', name: 'Premium', price: '499 ₺/ay' },
]

export const comparisonRows: {
  id: 'atm' | 'fxLimit' | 'fxFee' | 'stock' | 'deposit' | 'eft' | 'card' | 'atmAbroad' | 'setur' | 'migros' | 'migrosOnline' | 'divan'
  group: 'bank' | 'travel' | 'brand'
  icon: string
  values: Record<PlanColumnId, FeatureValue>
}[] = [
  {
    id: 'atm',
    group: 'bank',
    icon: 'atm',
    values: { account: '100 €/gün', standard: '250 €/gün', plus: '500 €/gün', premium: '1.000 €/gün' },
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
    id: 'stock',
    group: 'bank',
    icon: 'stock',
    values: { account: '%0,20', standard: '%0,12', plus: '%0,08', premium: '%0,04' },
  },
  {
    id: 'deposit',
    group: 'bank',
    icon: 'save',
    values: { account: '%32', standard: '%34', plus: '%36', premium: '%38' },
  },
  {
    id: 'eft',
    group: 'bank',
    icon: 'send',
    values: { account: '2 adet/ay', standard: '8 adet/ay', plus: '20 adet/ay', premium: 'Sınırsız' },
  },
  {
    id: 'card',
    group: 'travel',
    icon: 'card',
    values: { account: true, standard: true, plus: true, premium: true },
  },
  {
    id: 'atmAbroad',
    group: 'travel',
    icon: 'atm',
    values: { account: '100 €/gün', standard: '250 €/gün', plus: '500 €/gün', premium: '1.000 €/gün' },
  },
  {
    id: 'setur',
    group: 'travel',
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
    note: 'Paketsiz hesapta kapalı. Standard’dan itibaren açılır; oran paketinle yükselir.',
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
    note: 'Standard ve paketsiz hesapta bu kampanya kapalıdır.',
    rates: { account: false, standard: false, plus: '%10', premium: '%15' },
  },
  {
    id: 'setur',
    name: 'Setur',
    category: 'Seyahat',
    summary: 'Setur tur ve otel rezervasyonlarında paket ayrıcalığı. Plus turda, Premium tur + otelde.',
    how: 'Setur’da ödeme adımında AURE kartı kullan. Tur indirimi Plus’tan, otel avantajı Premium’dan açılır.',
    note: 'Paketsiz ve Standard’da Setur kampanyası yok; yurt dışı kart yine açıktır.',
    rates: { account: false, standard: false, plus: '%5 tur', premium: '%10 tur + otel' },
  },
]
