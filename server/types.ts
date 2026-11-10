export type VisitStats = {
  unique: number
  views: number
  lastVisit: string | null
  scope: 'production' | 'preview' | 'development'
}

export type WaitlistRow = {
  id: string
  name: string
  email: string
  intent: string
  cycle: BillingCycle
  createdAt: string
}

export const SUPPORT_KINDS = ['complaint', 'suggestion', 'support'] as const
export type SupportKind = (typeof SUPPORT_KINDS)[number]

export function isSupportKind(value: string): value is SupportKind {
  return (SUPPORT_KINDS as readonly string[]).includes(value)
}

export type SupportRow = {
  id: string
  name: string
  email: string
  kind: SupportKind
  message: string
  createdAt: string
}

export const INTENTS = ['account', 'standard', 'plus', 'premium'] as const
export type Intent = (typeof INTENTS)[number]

export const BILLING_CYCLES = ['none', 'monthly', 'yearly'] as const
export type BillingCycle = (typeof BILLING_CYCLES)[number]

export function isIntent(value: string): value is Intent {
  return (INTENTS as readonly string[]).includes(value)
}

export function isBillingCycle(value: string): value is BillingCycle {
  return (BILLING_CYCLES as readonly string[]).includes(value)
}
