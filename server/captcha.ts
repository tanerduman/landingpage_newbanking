import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

const TTL_MS = 5 * 60_000
const used = new Map<string, number>()

function secret() {
  return process.env.CAPTCHA_SECRET || process.env.POSTGRES_URL || 'aure-local-captcha'
}

function b64url(value: Buffer | string) {
  const buf = typeof value === 'string' ? Buffer.from(value) : value
  return buf.toString('base64url')
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

function macEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function pruneUsed(now = Date.now()) {
  for (const [token, exp] of used) {
    if (exp <= now) used.delete(token)
  }
  if (used.size > 4000) used.clear()
}

export function issueCaptcha() {
  const a = randomInt(2, 13)
  const b = randomInt(2, 13)
  const exp = Date.now() + TTL_MS
  const payload = b64url(JSON.stringify({ a, b, exp }))
  const token = `${payload}.${sign(payload)}`
  return { token, question: `${a} + ${b}` }
}

export function verifyCaptcha(token: unknown, answer: unknown) {
  if (typeof token !== 'string' || typeof answer !== 'string') {
    return 'Güvenlik sorusunu yanıtla.'
  }
  const trimmed = answer.trim().replace(',', '.')
  const value = Number(trimmed)
  if (!Number.isInteger(value)) return 'Güvenlik sorusunu yanıtla.'

  const parts = token.split('.')
  if (parts.length !== 2) return 'Güvenlik sorusu geçersiz. Yenile ve tekrar dene.'
  const [payload, mac] = parts
  if (!payload || !mac || !macEqual(mac, sign(payload))) {
    return 'Güvenlik sorusu geçersiz. Yenile ve tekrar dene.'
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { a?: unknown; b?: unknown; exp?: unknown }
    if (typeof data.a !== 'number' || typeof data.b !== 'number' || typeof data.exp !== 'number') {
      return 'Güvenlik sorusu geçersiz. Yenile ve tekrar dene.'
    }
    if (Date.now() > data.exp) return 'Süre doldu. Soruyu yenile.'
    pruneUsed()
    if (used.has(token)) return 'Bu soru kullanıldı. Yenile ve tekrar dene.'
    if (value !== data.a + data.b) return 'Sonuç hatalı. Tekrar dene.'
    used.set(token, data.exp)
    return true
  } catch {
    return 'Güvenlik sorusu geçersiz. Yenile ve tekrar dene.'
  }
}
