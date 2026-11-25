import { apiFetch, readApiJson } from './api.ts'

let cached: boolean | null = null
let shared: Promise<boolean> | null = null

export function cachedInvestorsOpen() {
  return cached
}

async function fetchInvestorsOpen() {
  const res = await apiFetch('/api/waitlist?investors=1')
  const data = await readApiJson<{ open?: unknown }>(res)
  if (!res?.ok || typeof data?.open !== 'boolean') return false
  return data.open
}

export function loadInvestorsOpen() {
  if (cached != null) return Promise.resolve(cached)
  if (!shared) {
    shared = fetchInvestorsOpen().then((open) => {
      cached = open
      return open
    })
  }
  return shared
}

export async function saveInvestorsOpen(open: boolean) {
  const res = await apiFetch('/api/waitlist', {
    method: 'PATCH',
    body: JSON.stringify({ investorsOpen: open }),
  })
  const data = await readApiJson<{ open?: unknown; error?: string }>(res)
  if (!res?.ok || typeof data?.open !== 'boolean') {
    shared = null
    throw new Error(data?.error || 'offline')
  }
  cached = data.open
  shared = Promise.resolve(data.open)
  return data.open
}
