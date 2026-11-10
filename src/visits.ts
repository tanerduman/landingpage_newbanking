import { apiFetch, readApiJson } from './api.ts'

const VISITOR_KEY = 'aure-visitor-id'
const STATS_KEY = 'aure-visit-stats'
const SESSION_KEY = 'aure-visit-session'

export type VisitStats = {
  unique: number
  views: number
  lastVisit: string | null
}

const empty: VisitStats = { unique: 0, views: 0, lastVisit: null }

export function loadVisitStats(): VisitStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return { ...empty }
    const parsed = JSON.parse(raw) as VisitStats
    return {
      unique: Number(parsed.unique) || 0,
      views: Number(parsed.views) || 0,
      lastVisit: parsed.lastVisit ?? null,
    }
  } catch {
    return { ...empty }
  }
}

function saveVisitStats(stats: VisitStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  window.dispatchEvent(new Event('aure-visits'))
}

function ids() {
  let visitor = localStorage.getItem(VISITOR_KEY)
  const newVisitor = !visitor
  if (!visitor) {
    visitor = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, visitor)
  }
  let session = sessionStorage.getItem(SESSION_KEY)
  const newSession = !session
  if (!session) {
    session = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, session)
  }
  return { visitor, session, newVisitor, newSession }
}

export async function recordVisit() {
  const { visitor, session, newVisitor, newSession } = ids()
  const res = await apiFetch('/api/visits', {
    method: 'POST',
    body: JSON.stringify({ visitorId: visitor, sessionId: session }),
  })
  const remote = await readApiJson<{ ok?: boolean }>(res)
  if (res?.ok && remote?.ok) {
    return loadVisitStats()
  }

  const stats = loadVisitStats()
  if (newVisitor) stats.unique += 1
  if (newSession) {
    stats.views += 1
    stats.lastVisit = new Date().toISOString()
  }
  saveVisitStats(stats)
  return stats
}

export async function fetchVisitStats(): Promise<VisitStats> {
  const res = await apiFetch('/api/visits')
  const remote = await readApiJson<VisitStats>(res)
  if (res?.ok && remote) {
    return {
      unique: Number(remote.unique) || 0,
      views: Number(remote.views) || 0,
      lastVisit: remote.lastVisit ?? null,
    }
  }
  return loadVisitStats()
}
