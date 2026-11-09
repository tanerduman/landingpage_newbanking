import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const TTL_MS = 12 * 60 * 60 * 1000

export const ADMIN_COOKIE = 'aure_session'
export const ADMIN_TTL_MS = TTL_MS

function sha(value: string) {
  return createHash('sha256').update(value).digest()
}

export function sessionSecret() {
  return process.env.WAITLIST_SESSION_SECRET || ''
}

function expectedUser() {
  return process.env.WAITLIST_USER || ''
}

function expectedPassword() {
  return process.env.WAITLIST_PASSWORD || ''
}

export function credentialsConfigured() {
  return Boolean(expectedUser() && expectedPassword() && sessionSecret())
}

export function passwordFingerprint() {
  return createHash('sha256').update(expectedPassword()).digest('hex')
}

export function checkCredentials(user: string, password: string) {
  if (!credentialsConfigured()) return false
  const userOk = timingSafeEqual(sha(user), sha(expectedUser()))
  const passOk = timingSafeEqual(sha(password), sha(expectedPassword()))
  return userOk && passOk
}

export function newSessionId() {
  return randomBytes(32).toString('base64url')
}

export function sessionKey(id: string) {
  return createHmac('sha256', sessionSecret()).update(id).digest('hex')
}

/** HMAC when WAITLIST_SESSION_SECRET is set, so short confirm codes are not unsalted SHA-256. */
export function secretDigest(value: string) {
  const secret = sessionSecret()
  if (secret) return createHmac('sha256', secret).update(value).digest('hex')
  return createHash('sha256').update(value).digest('hex')
}

export function readCookie(request: Request, name: string) {
  const header = request.headers.get('cookie') || ''
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (trimmed.slice(0, eq) !== name) continue
    try {
      return decodeURIComponent(trimmed.slice(eq + 1))
    } catch {
      return ''
    }
  }
  return ''
}

function cookieSecure(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || ''
  if (proto === 'https') return true
  if (proto === 'http') return false
  const host = (request.headers.get('host') || '').toLowerCase()
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return false
  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return true
  }
}

export function sessionCookie(id: string, request: Request, clear = false) {
  const bits = [
    `${ADMIN_COOKIE}=${clear ? '' : encodeURIComponent(id)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/api',
    `Max-Age=${clear ? 0 : Math.floor(TTL_MS / 1000)}`,
  ]
  if (cookieSecure(request)) bits.push('Secure')
  return bits.join('; ')
}
