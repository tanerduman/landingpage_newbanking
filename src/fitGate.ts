import { apiFetch, readApiJson } from './api.ts'

let cached: boolean | null = null
let shared: Promise<boolean> | null = null

export function cachedFitOpen() {
  return cached
}

async function fetchFitOpen() {
  const res = await apiFetch('/api/waitlist?fit=1')
  const data = await readApiJson<{ open?: unknown }>(res)
  if (!res?.ok || typeof data?.open !== 'boolean') return false
  return data.open
}

export function loadFitOpen() {
  if (cached != null) return Promise.resolve(cached)
  if (!shared) {
    shared = fetchFitOpen().then((open) => {
      cached = open
      return open
    })
  }
  return shared
}

export async function saveFitOpen(open: boolean) {
  const res = await apiFetch('/api/waitlist', {
    method: 'PATCH',
    body: JSON.stringify({ fitOpen: open }),
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
