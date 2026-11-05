import { issueCaptcha, verifyCaptcha } from './captcha.ts'
import { isProduction, publicAppUrl, sendWaitlistConfirm } from './email.ts'
import { getFxRates } from './fx.ts'
import { getStore, validateWaitlistInput } from './store.ts'

const buckets = new Map<string, { count: number; start: number }>()
const WINDOW_MS = 60_000
const LIMITS: Record<string, number> = {
  'POST /api/visits': 40,
  'POST /api/waitlist': 12,
  'GET /api/captcha': 40,
  'POST /api/confirm': 20,
}

const ALLOWED_ORIGINS = new Set([
  'https://tanerduman.github.io',
  'https://landingpage-newbanking.vercel.app',
  'https://getaure.org',
  'https://www.getaure.org',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])

function clientKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

function limited(request: Request, route: string) {
  const max = LIMITS[route]
  if (!max) return false
  const key = `${route}:${clientKey(request)}`
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now - bucket.start > WINDOW_MS) {
    buckets.set(key, { count: 1, start: now })
    return false
  }
  bucket.count += 1
  if (buckets.size > 4000) buckets.clear()
  return bucket.count > max
}

function json(data: unknown, status = 200, request?: Request) {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' })
  if (request) applyCors(request, headers)
  return new Response(JSON.stringify(data), { status, headers })
}

function originAllowed(origin: string) {
  if (ALLOWED_ORIGINS.has(origin)) return true
  try {
    const host = new URL(origin).hostname
    return host === 'vercel.app' || host.endsWith('.vercel.app')
  } catch {
    return false
  }
}

function applyCors(request: Request, headers: Headers) {
  const origin = request.headers.get('origin')
  if (origin && originAllowed(origin)) {
    headers.set('access-control-allow-origin', origin)
    headers.set('vary', 'Origin')
    headers.set('access-control-allow-headers', 'Authorization, Content-Type')
    headers.set('access-control-allow-methods', 'GET, POST, OPTIONS')
  }
}

function uuidLike(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f-]{8,80}$/i.test(value)
}

async function readJson(request: Request) {
  const length = Number(request.headers.get('content-length') || '0')
  if (length > 8_000) return { error: 'İstek çok büyük.' as const }
  const text = await request.text()
  if (text.length > 8_000) return { error: 'İstek çok büyük.' as const }
  if (!text) return { value: null }
  try {
    return { value: JSON.parse(text) as unknown }
  } catch {
    return { error: 'Geçersiz JSON.' as const }
  }
}

async function handleHealth(request: Request) {
  return json({ ok: true, store: getStore().kind }, 200, request)
}

async function handleRates(request: Request) {
  const result = await getFxRates()
  if (!result.ok) {
    return json({ error: result.code }, result.status, request)
  }
  return json(result.payload, 200, request)
}

async function handleVisits(request: Request) {
  const store = getStore()
  if (request.method === 'GET') {
    const stats = await store.getStats()
    return json({ ...stats, store: store.kind }, 200, request)
  }
  if (limited(request, 'POST /api/visits')) return json({ error: 'Çok fazla istek.' }, 429, request)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return json({ error: parsed.error }, 400, request)
  const body = parsed.value as { visitorId?: unknown; sessionId?: unknown } | null
  const visitorId = body?.visitorId
  const sessionId = body?.sessionId
  if (!uuidLike(visitorId) || !uuidLike(sessionId)) {
    return json({ error: 'Geçersiz ziyaret.' }, 400, request)
  }
  await store.recordVisit(visitorId, sessionId)
  return json({ ok: true, store: store.kind }, 200, request)
}

async function handleCaptcha(request: Request) {
  if (limited(request, 'GET /api/captcha')) return json({ error: 'Çok fazla istek.' }, 429, request)
  return json(issueCaptcha(), 200, request)
}

async function handleWaitlist(request: Request) {
  const store = getStore()
  if (request.method === 'GET') {
    const entries = await store.listWaitlist()
    return json({ entries, store: store.kind }, 200, request)
  }
  if (limited(request, 'POST /api/waitlist')) return json({ error: 'Çok fazla istek.' }, 429, request)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return json({ error: parsed.error }, 400, request)
  const body = parsed.value as { captchaToken?: unknown; captchaAnswer?: unknown } | null
  const captcha = verifyCaptcha(body?.captchaToken, body?.captchaAnswer)
  if (captcha !== true) return json({ error: captcha }, 400, request)
  const valid = validateWaitlistInput(parsed.value)
  if (typeof valid === 'string') return json({ error: valid }, 400, request)
  const result = await store.requestWaitlist(valid)
  if (result.status === 'updated') {
    return json({ updated: true, store: store.kind }, 200, request)
  }
  const link = `${publicAppUrl(request)}/confirm?token=${result.token}`
  const sent = await sendWaitlistConfirm({ to: result.email, code: result.code || '', link })
  if (!sent.ok && isProduction() && !sent.skipped) {
    return json({ error: 'Onay e-postası gönderilemedi. Az sonra tekrar dene.' }, 503, request)
  }
  if (!sent.ok && sent.skipped && isProduction()) {
    return json({ error: 'E-posta servisi henüz bağlanmadı.' }, 503, request)
  }
  return json(
    {
      pending: true,
      delivered: sent.ok,
      store: store.kind,
      ...(!isProduction() && !sent.ok ? { devCode: result.code } : {}),
    },
    201,
    request,
  )
}

async function handleConfirm(request: Request) {
  if (limited(request, 'POST /api/confirm')) return json({ error: 'Çok fazla istek.' }, 429, request)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return json({ error: parsed.error }, 400, request)
  const body = parsed.value as { token?: unknown; email?: unknown; code?: unknown } | null
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!token && !(email && code)) return json({ error: 'Onay kodu veya bağlantı gerekli.' }, 400, request)
  const result = await getStore().confirmWaitlist({
    token: token || undefined,
    email: email || undefined,
    code: code || undefined,
  })
  if (typeof result === 'string') return json({ error: result }, 400, request)
  return json({ confirmed: true, store: getStore().kind }, 200, request)
}

export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'

  if (request.method === 'OPTIONS' && path.startsWith('/api/')) {
    const headers = new Headers()
    applyCors(request, headers)
    return new Response(null, { status: 204, headers })
  }

  try {
    if (path === '/api/health' && request.method === 'GET') return handleHealth(request)
    if (path === '/api/rates' && request.method === 'GET') return handleRates(request)
    if (path === '/api/visits' && (request.method === 'GET' || request.method === 'POST')) {
      return handleVisits(request)
    }
    if (path === '/api/captcha' && request.method === 'GET') return handleCaptcha(request)
    if (path === '/api/waitlist' && (request.method === 'GET' || request.method === 'POST')) {
      return handleWaitlist(request)
    }
    if (path === '/api/confirm' && request.method === 'POST') return handleConfirm(request)
  } catch {
    return json({ error: 'Sunucu hatası.' }, 500, request)
  }

  if (path.startsWith('/api/')) return json({ error: 'Bulunamadı.' }, 404, request)
  return null
}

export async function nodeToWebRequest(req: {
  method?: string
  url?: string
  headers: NodeJS.Dict<string | string[]>
  on(event: 'data', cb: (chunk: Buffer) => void): void
  on(event: 'end', cb: () => void): void
  on(event: 'error', cb: (err: Error) => void): void
}) {
  const host = headerValue(req.headers.host) || '127.0.0.1'
  const url = `http://${host}${req.url || '/'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item))
    else headers.set(key, value)
  }
  const method = req.method || 'GET'
  const body =
    method === 'GET' || method === 'HEAD'
      ? undefined
      : await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', () => resolve(Buffer.concat(chunks)))
          req.on('error', reject)
        })
  return new Request(url, {
    method,
    headers,
    body: body && body.length > 0 ? new Uint8Array(body) : undefined,
  })
}

function headerValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

export async function writeNodeResponse(
  response: Response,
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body?: string | Buffer): void },
) {
  res.statusCode = response.status
  response.headers.forEach((value, name) => {
    res.setHeader(name, value)
  })
  const buf = Buffer.from(await response.arrayBuffer())
  res.end(buf)
}
