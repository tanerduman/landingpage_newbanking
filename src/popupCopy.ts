import { apiFetch, readApiJson } from './api.ts'
import { DEFAULT_POPUP_ID, type PopupStat, type PopupText, type SitePopup } from './popupCopyData.ts'

export type { PopupStat, SitePopup }
export { DEFAULT_POPUP_ID, POPUP_LIMIT, blankPopup } from './popupCopyData.ts'

const LEGACY_KEY = 'aure-weekend-fx'
const LEGACY_DONE = 'aure-popup-legacy'

export type PopupAdmin = {
  popups: SitePopup[]
  stats: PopupStat[]
}

function pair(value: unknown, max: number, required: boolean): PopupText | null {
  if (!value || typeof value !== 'object') return required ? null : { tr: '', en: '' }
  const row = value as { tr?: unknown; en?: unknown }
  if (typeof row.tr !== 'string' || typeof row.en !== 'string') return required ? null : { tr: '', en: '' }
  const tr = row.tr.replace(/\s+/g, ' ').trim()
  const en = row.en.replace(/\s+/g, ' ').trim()
  if (tr.length > max || en.length > max) return null
  if (required && (!tr || !en)) return null
  return { tr, en }
}

export function normalizePopup(value: unknown): SitePopup | null {
  if (!value || typeof value !== 'object') return null
  const row = value as {
    id?: unknown
    active?: unknown
    kicker?: unknown
    tag?: unknown
    question?: unknown
    yes?: unknown
    no?: unknown
  }
  if (typeof row.id !== 'string' || typeof row.active !== 'boolean') return null
  const kicker = pair(row.kicker, 32, false)
  const tag = pair(row.tag, 24, false)
  const question = pair(row.question, 280, true)
  const yes = pair(row.yes, 40, true)
  const no = pair(row.no, 32, true)
  if (!kicker || !tag || !question || !yes || !no) return null
  return { id: row.id, active: row.active, kicker, tag, question, yes, no }
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map(normalizePopup).filter((popup): popup is SitePopup => Boolean(popup))
}

function legacyAnswer() {
  try {
    const value = localStorage.getItem(LEGACY_KEY)
    return value === 'yes' || value === 'no' ? value : null
  } catch {
    return null
  }
}

async function migrateLegacy(visitorId: string) {
  const answer = legacyAnswer()
  if (!answer) return
  try {
    if (localStorage.getItem(LEGACY_DONE) === '1') return
  } catch {
    return
  }
  const result = await markPopupSeen(visitorId, DEFAULT_POPUP_ID, answer)
  if (result === 'fail') return
  try {
    localStorage.setItem(LEGACY_DONE, '1')
  } catch {
    /* ignore */
  }
}

export async function loadNextPopup(visitorId: string): Promise<SitePopup | null> {
  if (!visitorId) return null
  await migrateLegacy(visitorId)
  const res = await apiFetch(`/api/waitlist?ask=1&visitor=${encodeURIComponent(visitorId)}`)
  const remote = await readApiJson<{ next?: unknown }>(res)
  if (!res?.ok) return null
  return normalizePopup(remote?.next)
}

export async function markPopupSeen(visitorId: string, id: string, answer?: 'yes' | 'no'): Promise<'ok' | 'missing' | 'fail'> {
  const res = await apiFetch('/api/waitlist', {
    method: 'POST',
    body: JSON.stringify({ popupSeen: true, id, visitorId, ...(answer ? { answer } : {}) }),
  })
  if (res?.status === 404) return 'missing'
  const remote = await readApiJson<{ ok?: boolean }>(res)
  return res?.ok && remote?.ok ? 'ok' : 'fail'
}

export async function fetchPopupAdmin(): Promise<PopupAdmin | null> {
  const res = await apiFetch('/api/waitlist?popups=1')
  const remote = await readApiJson<{ popups?: unknown; stats?: unknown }>(res)
  if (!res?.ok || !remote) return null
  return { popups: normalizeList(remote.popups), stats: statsOf(remote.stats) }
}

function statsOf(value: unknown): PopupStat[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as { id?: unknown; shown?: unknown; yes?: unknown; no?: unknown; recent?: unknown }
    if (typeof row.id !== 'string') return []
    const recent = Array.isArray(row.recent)
      ? row.recent.flatMap((event) => {
          if (!event || typeof event !== 'object') return []
          const entry = event as { at?: unknown; answer?: unknown; ref?: unknown }
          if (typeof entry.at !== 'string' || typeof entry.ref !== 'string') return []
          const answer: 'yes' | 'no' | null = entry.answer === 'yes' || entry.answer === 'no' ? entry.answer : null
          return [{ at: entry.at, answer, ref: entry.ref }]
        })
      : []
    return [{ id: row.id, shown: Number(row.shown) || 0, yes: Number(row.yes) || 0, no: Number(row.no) || 0, recent }]
  })
}

export async function savePopupCatalog(popups: SitePopup[]): Promise<PopupAdmin> {
  const res = await apiFetch('/api/waitlist', {
    method: 'PATCH',
    body: JSON.stringify({ popupCatalog: true, popups }),
  })
  const remote = await readApiJson<{ popups?: unknown; stats?: unknown; error?: string }>(res)
  const saved = normalizeList(remote?.popups)
  if (!res?.ok || saved.length !== popups.length) throw new Error(remote?.error || 'invalid')
  return { popups: saved, stats: statsOf(remote?.stats) }
}
