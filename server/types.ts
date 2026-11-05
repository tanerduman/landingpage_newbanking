export type VisitStats = {
  unique: number
  views: number
  lastVisit: string | null
}

export type WaitlistRow = {
  id: string
  name: string
  email: string
  intent: string
  createdAt: string
}

export const INTENTS = ['account', 'standard', 'plus', 'premium'] as const
export type Intent = (typeof INTENTS)[number]

export function isIntent(value: string): value is Intent {
  return (INTENTS as readonly string[]).includes(value)
}
