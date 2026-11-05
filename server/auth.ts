import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12

function configuredPassword() {
  const value = process.env.WAITLIST_PASSWORD
  return typeof value === 'string' && value.length > 0 ? value : null
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest()
}

function signingKey() {
  const password = configuredPassword()
  if (!password) return null
  return createHash('sha256').update(`aure-session:${password}`).digest()
}

export function adminConfigured() {
  return configuredPassword() !== null
}

export function passwordMatches(username: string, password: string) {
  const expectedPassword = configuredPassword()
  if (!expectedPassword) return false
  const expectedUser = process.env.WAITLIST_USER
  if (typeof expectedUser === 'string' && expectedUser.length > 0) {
    const userA = Buffer.from(username.trim())
    const userB = Buffer.from(expectedUser)
    if (userA.length !== userB.length || !timingSafeEqual(userA, userB)) return false
  } else if (username.trim().length === 0) {
    return false
  }
  const a = sha256(password)
  const b = sha256(expectedPassword)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function issueToken() {
  const key = signingKey()
  if (!key) return null
  const exp = Date.now() + TOKEN_TTL_MS
  const nonce = randomBytes(16).toString('hex')
  const payload = `${exp}.${nonce}`
  const sig = createHmac('sha256', key).update(payload).digest('hex')
  return `${sig}.${payload}`
}

export function tokenValid(token: string | null | undefined) {
  const key = signingKey()
  if (!key || !token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [sig, expRaw, nonce] = parts
  if (!sig || !expRaw || !nonce) return false
  const payload = `${expRaw}.${nonce}`
  const expected = createHmac('sha256', key).update(payload).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  const exp = Number(expRaw)
  return Number.isFinite(exp) && Date.now() < exp
}

export function bearerToken(request: Request) {
  const header = request.headers.get('authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1] ?? null
}
