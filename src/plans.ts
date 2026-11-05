import type { PlanId } from './waitlist'

export type PlanColumnId = 'account' | PlanId
export type FeatureValue = string | boolean

export const plans: {
  id: PlanId
  name: string
  monthly: number
  blurb: string
  perks: string[]
  featured?: boolean
}[] = [
  {
    id: 'standard',
    name: 'Standard',
    monthly: 49,
    blurb: 'Günlük harcamayı daha rahat yönet.',
    perks: ['Fiziksel kart dahil', '1.000 €/ay ücretsiz ATM', 'Hafta içi piyasa kuruna yakın döviz', 'Anlık bildirimler'],
  },
  {
    id: 'plus',
    name: 'Plus',
    monthly: 99,
    blurb: 'Daha yüksek limit, daha az sürpriz.',
    perks: ['Sınırsız yerel transfer', '3.000 €/ay ücretsiz ATM', 'Alışveriş koruması', 'Öncelikli destek'],
  },
  {
    id: 'premium',
    name: 'Premium',
    monthly: 249,
    blurb: 'Seyahat ve döviz için en dengeli plan.',
    perks: [
      'Sınırsız ücretsiz döviz',
      'Yurtdışı sağlık sigortası',
      'LoungeKey erişimi',
      'Kripto ve hisse alımında düşük komisyon',
    ],
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
  { label: 'Aylık ücret', group: 'Fiyat', values: { account: '0 ₺', standard: '49 ₺', plus: '99 ₺', premium: '249 ₺' } },
  { label: 'Hesap açılışı', group: 'Hesap', values: { account: true, standard: true, plus: true, premium: true } },
  { label: 'Sanal kart', group: 'Kart', values: { account: true, standard: true, plus: true, premium: true } },
  {
    label: 'Fiziksel kart',
    group: 'Kart',
    values: { account: 'İsteğe bağlı', standard: 'Plastik', plus: 'Plus kart', premium: 'Premium kart' },
  },
  { label: 'Anlık bildirimler', group: 'Kart', values: { account: true, standard: true, plus: true, premium: true } },
  {
    label: 'Ücretsiz döviz',
    group: 'Döviz',
    values: { account: '250 €/ay', standard: '1.000 €/ay', plus: '3.000 €/ay', premium: 'Sınırsız' },
  },
  {
    label: 'Döviz makası',
    group: 'Döviz',
    values: { account: 'Limit üstü var', standard: 'Limit üstü var', plus: 'Limit üstü var', premium: '%0' },
  },
  {
    label: 'ATM çekimi',
    group: 'Nakit',
    values: { account: '200 €/ay', standard: '1.000 €/ay', plus: '3.000 €/ay', premium: '800 €/ay yurtdışı' },
  },
  { label: 'Sınırsız yerel transfer', group: 'Transfer', values: { account: false, standard: false, plus: true, premium: true } },
  { label: 'Alışveriş koruması', group: 'Koruma', values: { account: false, standard: false, plus: true, premium: true } },
  { label: 'Öncelikli destek', group: 'Destek', values: { account: false, standard: false, plus: true, premium: true } },
  { label: 'Seyahat sigortası', group: 'Seyahat', values: { account: false, standard: false, plus: false, premium: true } },
  { label: 'Lounge erişimi', group: 'Seyahat', values: { account: false, standard: false, plus: false, premium: '2 misafir' } },
  {
    label: 'Yatırım komisyonu',
    group: 'Yatırım',
    values: { account: 'Standart', standard: 'Standart', plus: 'İndirimli', premium: 'Düşük' },
  },
]
