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

export function recordVisit() {
  const stats = loadVisitStats()
  let visitorId = localStorage.getItem(VISITOR_KEY)
  if (!visitorId) {
    visitorId = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, visitorId)
    stats.unique += 1
  }
  if (!sessionStorage.getItem(SESSION_KEY)) {
    sessionStorage.setItem(SESSION_KEY, '1')
    stats.views += 1
    stats.lastVisit = new Date().toISOString()
  }
  saveVisitStats(stats)
  return stats
}
