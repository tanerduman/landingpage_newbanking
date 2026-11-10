import type { PlanId } from './waitlist'

export type PlanColumnId = 'account' | PlanId
export type FeatureValue = string | boolean

export const plans: {
  id: PlanId
  name: string
  monthly: number
  overnight: number
  campaignRate: number
  installmentRate: number
  featured?: boolean
}[] = [
  {
    id: 'standard',
    name: 'Standard',
    monthly: 149,
    overnight: 0.345,
    campaignRate: 0.02,
    installmentRate: 0.015,
  },
  {
    id: 'plus',
    name: 'Plus',
    monthly: 299,
    overnight: 0.3475,
    campaignRate: 0.04,
    installmentRate: 0.025,
    featured: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthly: 499,
    overnight: 0.35,
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

/** Overnight rate on the free Basic account. Paid-plan interest is shown as the extra above this. */
export const ACCOUNT_OVERNIGHT = 0.34

/** Worked example: idle cash on a Basic account. The EUR leg uses the live rate. */
export const SAMPLE_IDLE_TRY = 1_000_000

export const SPEND_MAX = 80_000
export const SPEND_STEP = 1_000
export const IDLE_STEP = 5_000
export const FX_MIN = 0
export const FX_MAX = SAMPLE_IDLE_TRY
export const FX_STEP = 5_000
/** Worked example: selling EUR back to TRY. */
export const SAMPLE_EUR_SELL = 20_000
export const FX_SELL_MIN = 0
export const FX_SELL_MAX = SAMPLE_EUR_SELL
export const FX_SELL_STEP = 500

function extrasPerSpend(plan: (typeof plans)[number]) {
  return plan.campaignRate * 0.4 + plan.installmentRate * 0.2
}

export const fxFeeByColumn: Record<PlanColumnId, number> = {
  account: 0.04,
  standard: 0.02,
  plus: 0.01,
  premium: 0.005,
}

/** EUR bought each month at the plan spread. Null means the plan rate applies to the whole amount. */
export const fxLimitEurByColumn: Record<PlanColumnId, number | null> = {
  account: null,
  standard: 1_500,
  plus: 5_000,
  premium: null,
}

/** Fallback EUR/TRY until /api/rates returns a live quote. */
export const SAMPLE_EUR_TRY = 55.92

export function eurFromTry(planId: PlanColumnId, tryAmount: number, market: number) {
  if (tryAmount <= 0 || market <= 0) return 0
  const fee = fxFeeByColumn[planId]
  const eurAt = (tryAmt: number, spread: number) => tryAmt / (market * (1 + spread))
  const cap = fxLimitEurByColumn[planId]
  if (cap == null) return eurAt(tryAmount, fee)
  const tryAtCap = cap * market * (1 + fee)
  if (tryAmount <= tryAtCap) return eurAt(tryAmount, fee)
  return cap + eurAt(tryAmount - tryAtCap, fxFeeByColumn.account)
}

export function fxSavingTry(planId: PlanColumnId, fxTry: number, market: number) {
  if (planId === 'account' || fxTry <= 0 || market <= 0) return 0
  return (eurFromTry(planId, fxTry, market) - eurFromTry('account', fxTry, market)) * market
}

/** Spread when selling EUR for TRY. Unlike buys, the plan rate applies to the whole amount. */
export const fxSellFeeByColumn: Record<PlanColumnId, number> = {
  account: 0.025,
  standard: 0.015,
  plus: 0.01,
  premium: 0.005,
}

export function tryFromEur(planId: PlanColumnId, eurAmount: number, market: number) {
  if (eurAmount <= 0 || market <= 0) return 0
  return (eurAmount * market) / (1 + fxSellFeeByColumn[planId])
}

export function fxSellSavingTry(planId: PlanColumnId, eurAmount: number, market: number) {
  if (planId === 'account' || eurAmount <= 0 || market <= 0) return 0
  return tryFromEur(planId, eurAmount, market) - tryFromEur('account', eurAmount, market)
}

export function planBreakdown(
  plan: (typeof plans)[number],
  spend: number,
  idle: number,
  cycleYearly = false,
  fxTry = 0,
  eurTry = 0,
  fxSellEur = 0,
) {
  const fee = cycleYearly ? (plan.monthly * 10) / 12 : plan.monthly
  const interest = (idle * (plan.overnight - ACCOUNT_OVERNIGHT)) / 12
  const extras = spend * extrasPerSpend(plan)
  const fx = fxSavingTry(plan.id, fxTry, eurTry)
  const fxSell = fxSellSavingTry(plan.id, fxSellEur, eurTry)
  return { fee, interest, extras, fx, fxSell, net: interest + extras + fx + fxSell - fee }
}

export function planNet(plan: (typeof plans)[number], spend: number, idle: number, cycleYearly = false) {
  return planBreakdown(plan, spend, idle, cycleYearly).net
}

function floorsWithoutLoss() {
  for (let idle = IDLE_STEP; idle <= SAMPLE_IDLE_TRY; idle += IDLE_STEP) {
    for (let spend = SPEND_STEP; spend <= SPEND_MAX; spend += SPEND_STEP) {
      if (plans.every((plan) => planNet(plan, spend, idle) >= 0)) return { spend, idle }
    }
  }
  return { spend: SPEND_MAX, idle: SAMPLE_IDLE_TRY }
}

const floors = floorsWithoutLoss()
/** Lowest slider values where Standard, Plus and Premium all stay non-negative. */
export const SPEND_MIN = floors.spend
export const IDLE_MIN = floors.idle

function stepUp(value: number, step: number, min: number, max: number) {
  const stepped = Math.ceil(value / step - 1e-9) * step
  return Math.min(max, Math.max(min, stepped))
}

/** Smallest spend and idle that each cover the plan fee on their own. */
export function minimumScenario(plan: (typeof plans)[number], cycleYearly: boolean) {
  const fee = cycleYearly ? (plan.monthly * 10) / 12 : plan.monthly
  const perIdle = (plan.overnight - ACCOUNT_OVERNIGHT) / 12
  const perSpend = extrasPerSpend(plan)
  return {
    spend: stepUp(fee / perSpend, SPEND_STEP, SPEND_MIN, SPEND_MAX),
    idle: stepUp(fee / perIdle, IDLE_STEP, IDLE_MIN, SAMPLE_IDLE_TRY),
  }
}

export const overnightByColumn: Record<PlanColumnId, number> = {
  account: ACCOUNT_OVERNIGHT,
  ...Object.fromEntries(plans.map((plan) => [plan.id, plan.overnight])),
} as Record<PlanColumnId, number>

/** Fallback gram gold until CollectAPI returns the live selling price. Basic stays 6,450 ₺/g in that sample. */
export const SAMPLE_GOLD_GRAMS = 10
export const SAMPLE_GOLD_TEMEL_TRY = 6_450
/** Sale price is this far above the market gram price. */
export const goldSpreadByColumn: Record<PlanColumnId, number> = {
  account: 0.04,
  standard: 0.02,
  plus: 0.01,
  premium: 0.005,
}
export const SAMPLE_GOLD_TRY =
  Math.round((SAMPLE_GOLD_TEMEL_TRY / (1 + goldSpreadByColumn.account)) * 100) / 100

export function monthlyFeeOf(id: PlanColumnId): number {
  if (id === 'account') return 0
  return plans.find((plan) => plan.id === id)?.monthly ?? 0
}

export const comparisonRows: {
  id:
    | 'planFee'
    | 'overnight'
    | 'eft'
    | 'fxLimit'
    | 'fxFee'
    | 'fxFeeOver'
    | 'fxSellFee'
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
    | 'atm'
    | 'cashback'
    | 'miles'
  group: 'bank' | 'travel' | 'brand'
  icon: string
  values: Record<PlanColumnId, FeatureValue>
}[] = [
  {
    id: 'planFee',
    group: 'bank',
    icon: 'save',
    values: { account: '0 ₺', standard: '149 ₺', plus: '299 ₺', premium: '499 ₺' },
  },
  {
    id: 'overnight',
    group: 'bank',
    icon: 'save',
    values: { account: '%34', standard: '%34,5', plus: '%34,75', premium: '%35' },
  },
  {
    id: 'eft',
    group: 'bank',
    icon: 'send',
    values: { account: 'unlimited0', standard: 'unlimited0', plus: 'unlimited0', premium: 'unlimited0' },
  },
  {
    id: 'atm',
    group: 'bank',
    icon: 'atm',
    values: { account: false, standard: '250 €/gün', plus: '500 €/gün', premium: '1.000 €/gün' },
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
    values: { account: '%4', standard: '%2', plus: '%1', premium: '%0,5' },
  },
  {
    id: 'fxFeeOver',
    group: 'bank',
    icon: 'fx',
    values: { account: '%4', standard: '%4', plus: '%4', premium: '%0,5' },
  },
  {
    id: 'fxSellFee',
    group: 'bank',
    icon: 'fx',
    values: { account: '%2,5', standard: '%1,5', plus: '%1', premium: '%0,5' },
  },
  {
    id: 'goldSpread',
    group: 'bank',
    icon: 'save',
    values: { account: '%4', standard: '%2', plus: '%1', premium: '%0,5' },
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
    id: 'cashback',
    group: 'travel',
    icon: 'save',
    values: { account: false, standard: false, plus: '%10', premium: '%10' },
  },
  {
    id: 'miles',
    group: 'travel',
    icon: 'plane',
    values: { account: false, standard: false, plus: false, premium: '2×' },
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
