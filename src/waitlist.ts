export type PlanId = 'standard' | 'plus' | 'premium'
export type SignupIntent = 'account' | PlanId

export type WaitlistEntry = {
  id: string
  name: string
  email: string
  intent: SignupIntent
  createdAt: string
}

export const PACKAGE_LABELS: Record<SignupIntent, string> = {
  account: 'Paketsiz hesap',
  standard: 'Standard',
  plus: 'Plus',
  premium: 'Premium',
}

export const PACKAGE_FILTERS: { id: 'all' | SignupIntent; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'account', label: 'Paketsiz hesap' },
  { id: 'standard', label: 'Standard' },
  { id: 'plus', label: 'Plus' },
  { id: 'premium', label: 'Premium' },
]

const KEY = 'aure-waitlist'

export function loadWaitlist(): WaitlistEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WaitlistEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function addWaitlistEntry(input: { name: string; email: string; intent: SignupIntent }): WaitlistEntry {
  const item: WaitlistEntry = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    intent: input.intent,
    createdAt: new Date().toISOString(),
  }
  const next = [item, ...loadWaitlist()]
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('aure-waitlist'))
  return item
}

export function countByIntent(entries: WaitlistEntry[]) {
  return {
    all: entries.length,
    account: entries.filter((e) => e.intent === 'account').length,
    standard: entries.filter((e) => e.intent === 'standard').length,
    plus: entries.filter((e) => e.intent === 'plus').length,
    premium: entries.filter((e) => e.intent === 'premium').length,
  }
}

export function formatRequestTime(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}
