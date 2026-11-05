import type { PlanId } from './waitlist'

export type PlanColumnId = 'account' | PlanId
export type FeatureValue = string | boolean

export const plans: {
  id: PlanId
  name: string
  monthly: number
  blurb: string
  banking: string[]
  campaigns: string[]
  featured?: boolean
}[] = [
  {
    id: 'standard',
    name: 'Standard',
    monthly: 49,
    blurb: 'Günlük bankacılık + ilk market indirimleri.',
    banking: ['ATM 250 €/gün', 'Döviz 1.500 €/ay · %0,75', 'Hisse %0,12', 'Mevduat %34', '8 ücretsiz EFT/ay'],
    campaigns: ['Migros %2', 'Migros Sanal Market %2'],
  },
  {
    id: 'plus',
    name: 'Plus',
    monthly: 99,
    blurb: 'Daha yüksek limit, daha iyi faiz, daha fazla kampanya.',
    banking: ['ATM 500 €/gün', 'Döviz 5.000 €/ay · %0,35', 'Hisse %0,08', 'Mevduat %36', '20 ücretsiz EFT/ay'],
    campaigns: ['Migros %4', 'Koç Ailem üye', 'Divan Pastanesi %10', 'Setur %5'],
    featured: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthly: 249,
    blurb: 'Sınırsız döviz, en yüksek faiz ve tam kampanya paketi.',
    banking: ['ATM 1.000 €/gün', 'Döviz sınırsız · %0', 'Hisse %0,04', 'Mevduat %38', 'Sınırsız ücretsiz EFT'],
    campaigns: ['Migros %7', 'Koç Ailem ekstra', 'Divan Pastanesi %15', 'Setur %10'],
    featured: true,
  },
]

export const planColumns: { id: PlanColumnId; name: string }[] = [
  { id: 'account', name: 'Paketsiz hesap' },
  { id: 'standard', name: 'Standard' },
  { id: 'plus', name: 'Plus' },
  { id: 'premium', name: 'Premium' },
]

export const comparisonRows: { label: string; group: string; values: Record<PlanColumnId, FeatureValue> }[] = [
  { label: 'Aylık ücret', group: 'Banka / Saving', values: { account: '0 ₺', standard: '49 ₺', plus: '99 ₺', premium: '249 ₺' } },
  {
    label: 'Günlük ATM döviz çekimi',
    group: 'Banka / Saving',
    values: { account: '100 €/gün', standard: '250 €/gün', plus: '500 €/gün', premium: '1.000 €/gün' },
  },
  {
    label: 'Aylık döviz alım-satım (indirimli komisyon)',
    group: 'Banka / Saving',
    values: { account: '250 €/ay', standard: '1.500 €/ay', plus: '5.000 €/ay', premium: 'Sınırsız' },
  },
  {
    label: 'Döviz komisyonu (limit içi)',
    group: 'Banka / Saving',
    values: { account: '%1,49', standard: '%0,75', plus: '%0,35', premium: '%0' },
  },
  {
    label: 'Hisse senedi alım-satım komisyonu',
    group: 'Banka / Saving',
    values: { account: '%0,20', standard: '%0,12', plus: '%0,08', premium: '%0,04' },
  },
  {
    label: 'Mevduat faizi (örnek TL)',
    group: 'Banka / Saving',
    values: { account: '%32', standard: '%34', plus: '%36', premium: '%38' },
  },
  {
    label: 'Ücretsiz EFT / havale',
    group: 'Banka / Saving',
    values: { account: '2 adet/ay', standard: '8 adet/ay', plus: '20 adet/ay', premium: 'Sınırsız' },
  },
  {
    label: 'Migros mağaza',
    group: 'Kampanya',
    values: { account: false, standard: '%2 indirim', plus: '%4 indirim', premium: '%7 indirim' },
  },
  {
    label: 'Migros Sanal Market',
    group: 'Kampanya',
    values: { account: false, standard: '%2 indirim', plus: '%5 indirim', premium: '%8 indirim' },
  },
  {
    label: 'Koç Ailem',
    group: 'Kampanya',
    values: { account: false, standard: false, plus: 'Üyelik', premium: 'Üyelik + ekstra puan' },
  },
  {
    label: 'Divan Pastanesi',
    group: 'Kampanya',
    values: { account: false, standard: false, plus: '%10', premium: '%15' },
  },
  {
    label: 'Setur',
    group: 'Kampanya',
    values: { account: false, standard: false, plus: '%5 tur', premium: '%10 tur + otel' },
  },
]
