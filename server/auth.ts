import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const USERNAME = 'admin'
const PASSWORD_SHA256 = '1c88f121522221bd8bb119a09ffee582fe3b0b1d49a6b9bb01c56620663f3509'
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12

function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function secret() {
  return process.env.WAITLIST_PASSWORD || PASSWORD_SHA256
}

export function passwordMatches(username: string, password: string) {
  if (username.trim().toLowerCase() !== USERNAME) return false
  const envPassword = process.env.WAITLIST_PASSWORD
  if (typeof envPassword === 'string' && envPassword.length > 0) {
    const a = Buffer.from(password)
    const b = Buffer.from(envPassword)
    return a.length === b.length && timingSafeEqual(a, b)
  }
  return sha256Hex(password) === PASSWORD_SHA256
}

export function issueToken() {
  const exp = Date.now() + TOKEN_TTL_MS
  const nonce = randomBytes(16).toString('hex')
  const payload = `${exp}.${nonce}`
  const sig = createHmac('sha256', secret()).update(payload).digest('hex')
  return `${sig}.${payload}`
}

export function tokenValid(token: string | null | undefined) {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [sig, expRaw, nonce] = parts
  if (!sig || !expRaw || !nonce) return false
  const payload = `${expRaw}.${nonce}`
  const expected = createHmac('sha256', secret()).update(payload).digest('hex')
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
