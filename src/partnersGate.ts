import { apiFetch, readApiJson } from './api.ts'

let cached: boolean | null = null
let shared: Promise<boolean> | null = null

export function cachedPartnersOpen() {
  return cached
}

async function fetchPartnersOpen() {
  const res = await apiFetch('/api/waitlist?partners=1')
  const data = await readApiJson<{ open?: unknown }>(res)
  if (!res?.ok || typeof data?.open !== 'boolean') return true
  return data.open
}

export function loadPartnersOpen() {
  if (cached != null) return Promise.resolve(cached)
  if (!shared) {
    shared = fetchPartnersOpen().then((open) => {
      cached = open
      return open
    })
  }
  return shared
}

export async function savePartnersOpen(open: boolean) {
  const res = await apiFetch('/api/waitlist', {
    method: 'PATCH',
    body: JSON.stringify({ partnersOpen: open }),
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
