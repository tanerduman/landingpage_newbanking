export type DataSource = 'postgres' | 'memory' | 'browser'

const TOKEN_KEY = 'aure-waitlist-token'
const API_BASE = String(import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

export function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  const token = getAdminToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  try {
    const res = await fetch(apiUrl(path), { ...init, headers })
    const type = res.headers.get('content-type') || ''
    if (!type.includes('application/json')) return null
    return res
  } catch {
    return null
  }
}

export async function fetchApiHealth() {
  const res = await apiFetch('/api/health')
  return readApiJson<{ ok?: boolean; store?: DataSource; authRequired?: boolean }>(res)
}

export async function readApiJson<T>(res: Response | null): Promise<T | null> {
  if (!res) return null
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}
