const SESSION_KEY = 'aure-waitlist-auth'
const USERNAME = 'admin'
const PASSWORD_SHA256 = '1c88f121522221bd8bb119a09ffee582fe3b0b1d49a6b9bb01c56620663f3509'

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isWaitlistAuthed() {
  return sessionStorage.getItem(SESSION_KEY) === 'ok'
}

export function logoutWaitlist() {
  sessionStorage.removeItem(SESSION_KEY)
}

export async function loginWaitlist(username: string, password: string) {
  const userOk = username.trim().toLowerCase() === USERNAME
  const envPassword = import.meta.env.VITE_WAITLIST_PASSWORD
  const passwordOk =
    typeof envPassword === 'string' && envPassword.length > 0
      ? password === envPassword
      : (await sha256Hex(password)) === PASSWORD_SHA256

  if (!userOk || !passwordOk) return false
  sessionStorage.setItem(SESSION_KEY, 'ok')
  return true
}
