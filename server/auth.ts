import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const TTL_MS = 12 * 60 * 60 * 1000

function sha(value: string) {
  return createHash('sha256').update(value).digest()
}

function sessionSecret() {
  return process.env.WAITLIST_SESSION_SECRET || process.env.WAITLIST_PASSWORD || ''
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

export function checkCredentials(user: string, password: string) {
  if (!credentialsConfigured()) return false
  const userOk = timingSafeEqual(sha(user), sha(expectedUser()))
  const passOk = timingSafeEqual(sha(password), sha(expectedPassword()))
  return userOk && passOk
}

export function issueToken(user: string) {
  const exp = Date.now() + TTL_MS
  const payload = `${user}:${exp}`
  const sig = createHmac('sha256', sessionSecret()).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export function readAdmin(request: Request) {
  const header = request.headers.get('authorization') || ''
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  if (!token || !sessionSecret()) return null
  let raw = ''
  try {
    raw = Buffer.from(token, 'base64url').toString('utf8')
  } catch {
    return null
  }
  const parts = raw.split(':')
  const sig = parts.pop() || ''
  const expRaw = parts.pop() || ''
  const user = parts.join(':')
  const exp = Number(expRaw)
  if (!user || !sig || !Number.isFinite(exp) || exp < Date.now()) return null
  const payload = `${user}:${exp}`
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('hex')
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  return { user, exp }
}
