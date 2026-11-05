import { apiFetch, getAdminToken, readApiJson, setAdminToken } from './api.ts'

const SESSION_KEY = 'aure-waitlist-auth'

export function isWaitlistAuthed() {
  return sessionStorage.getItem(SESSION_KEY) === 'ok' && Boolean(getAdminToken())
}

export function logoutWaitlist() {
  sessionStorage.removeItem(SESSION_KEY)
  setAdminToken(null)
}

export async function loginWaitlist(username: string, password: string) {
  const res = await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  const remote = await readApiJson<{ token?: string }>(res)
  if (res?.ok && remote?.token) {
    setAdminToken(remote.token)
    sessionStorage.setItem(SESSION_KEY, 'ok')
    return true
  }
  return false
}
