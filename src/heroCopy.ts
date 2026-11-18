import { apiFetch, readApiJson } from './api.ts'
import { type HeroCopy, type HeroText } from './heroCopyData.ts'

export type { HeroCopy, HeroText }

function pair(value: unknown, max: number): HeroText | null {
  if (!value || typeof value !== 'object') return null
  const row = value as { tr?: unknown; en?: unknown }
  if (typeof row.tr !== 'string' || typeof row.en !== 'string') return null
  const tr = row.tr.replace(/\r\n/g, '\n').trim()
  const en = row.en.replace(/\r\n/g, '\n').trim()
  if (!tr || !en || tr.length > max || en.length > max) return null
  return { tr, en }
}

export function normalizeHeroCopy(value: unknown): HeroCopy | null {
  if (!value || typeof value !== 'object') return null
  const data = value as { title?: unknown; lead?: unknown }
  const title = pair(data.title, 240)
  const lead = pair(data.lead, 900)
  if (!title || !lead) return null
  return { title, lead }
}

export async function fetchHeroCopy(): Promise<HeroCopy | null> {
  const res = await apiFetch('/api/waitlist?hero=1')
  const remote = await readApiJson<{ hero?: HeroCopy }>(res)
  if (!res?.ok) return null
  return normalizeHeroCopy(remote?.hero)
}

export async function saveHeroCopy(copy: HeroCopy): Promise<HeroCopy> {
  const res = await apiFetch('/api/waitlist', {
    method: 'PATCH',
    body: JSON.stringify({ heroCopy: true, ...copy }),
  })
  const remote = await readApiJson<{ hero?: HeroCopy; error?: string }>(res)
  const saved = normalizeHeroCopy(remote?.hero)
  if (!res?.ok || !saved) throw new Error(remote?.error || 'invalid')
  return saved
}
