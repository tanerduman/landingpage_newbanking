import { apiFetch, readApiJson } from './api.ts'
import { messages, readLocale } from './i18n/index.ts'

export const INTEREST_SECTORS = [
  'market',
  'online',
  'food',
  'patisserie',
  'travel',
  'home',
  'shopping',
  'education',
] as const

export type InterestSector = (typeof INTEREST_SECTORS)[number]

export type InterestEntry = {
  id: string
  name: string
  email: string
  intent: 'account' | 'standard' | 'plus' | 'premium'
  sectors: InterestSector[]
  updatedAt: string
}

function isSector(value: string): value is InterestSector {
  return (INTEREST_SECTORS as readonly string[]).includes(value)
}

function normalize(row: InterestEntry): InterestEntry | null {
  const intent = row.intent
  if (intent !== 'account' && intent !== 'standard' && intent !== 'plus' && intent !== 'premium') return null
  const sectors = Array.isArray(row.sectors) ? row.sectors.filter(isSector) : []
  if (!sectors.length) return null
  return { ...row, intent, sectors }
}

export async function saveInterest(email: string, sectors: InterestSector[]) {
  const res = await apiFetch('/api/interest', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), sectors, lang: readLocale() }),
  })
  const remote = await readApiJson<{ ok?: boolean; error?: string }>(res)
  if (res?.ok && remote?.ok) return
  const t = messages(readLocale())
  throw new Error(remote?.error || t.errors.interest_fail || t.signup.saveFail)
}

export async function fetchInterests(): Promise<{ entries: InterestEntry[]; authorized: boolean }> {
  const res = await apiFetch('/api/interest')
  if (res?.status === 401 || !res?.ok) return { entries: [], authorized: false }
  const remote = await readApiJson<{ entries?: InterestEntry[] }>(res)
  if (!remote?.entries) return { entries: [], authorized: false }
  return { entries: remote.entries.flatMap((row) => {
    const next = normalize(row)
    return next ? [next] : []
  }), authorized: true }
}
