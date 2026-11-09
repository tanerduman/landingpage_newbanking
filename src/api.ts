export type DataSource = 'postgres' | 'memory' | 'browser'

const API_BASE = String(import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

export function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

function currentLang() {
  try {
    const saved = localStorage.getItem('aure-lang')
    if (saved === 'en' || saved === 'tr') return saved
  } catch {
    /* ignore */
  }
  return 'tr'
}

export async function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  if (!headers.has('accept-language')) headers.set('accept-language', currentLang())
  try {
    const res = await fetch(apiUrl(path), { ...init, headers, credentials: 'include' })
    const type = res.headers.get('content-type') || ''
    if (!type.includes('application/json')) return null
    return res
  } catch {
    return null
  }
}

export async function readApiJson<T>(res: Response | null): Promise<T | null> {
  if (!res) return null
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}
