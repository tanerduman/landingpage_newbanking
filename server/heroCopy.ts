import { filmOpacityOf, type HeroCopy, type HeroText } from '../src/heroCopyData.ts'

function field(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.replace(/\r\n/g, '\n').trim()
  if (!text || text.length > max) return null
  return text
}

function pair(value: unknown, max: number): HeroText | null {
  if (!value || typeof value !== 'object') return null
  const row = value as { tr?: unknown; en?: unknown }
  const tr = field(row.tr, max)
  const en = field(row.en, max)
  if (!tr || !en) return null
  return { tr, en }
}

export function validateHeroCopy(body: unknown): HeroCopy | string {
  if (!body || typeof body !== 'object') return 'invalid'
  const data = body as { title?: unknown; lead?: unknown; filmOpacity?: unknown }
  const title = pair(data.title, 240)
  const lead = pair(data.lead, 900)
  if (!title || !lead) return 'invalid'
  return { title, lead, filmOpacity: filmOpacityOf(data.filmOpacity) }
}
