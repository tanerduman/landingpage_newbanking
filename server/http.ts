import { checkCredentials, credentialsConfigured, issueToken, readAdmin } from './auth.ts'
import { isProduction, normalizeEmail, publicAppUrl, sendWaitlistConfirm } from './email.ts'
import { getFxRates } from './fx.ts'
import { apiError, localeFromRequest, type ApiLocale } from './i18n.ts'
import { getStore, validateWaitlistInput } from './store.ts'

const buckets = new Map<string, { count: number; start: number }>()
const WINDOW_MS = 60_000
const LIMITS: Record<string, number> = {
  'POST /api/visits': 40,
  'POST /api/waitlist': 12,
  'POST /api/confirm': 20,
  'POST /api/confirm-status': 60,
  'POST /api/login': 8,
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

function fail(request: Request, code: string, status: number, body?: unknown) {
  const locale: ApiLocale = localeFromRequest(request, body)
  return json({ error: apiError(code, locale), code }, status, request)
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
  if (length > 8_000) return { error: 'too_big' as const }
  const text = await request.text()
  if (text.length > 8_000) return { error: 'too_big' as const }
  if (!text) return { value: null }
  try {
    return { value: JSON.parse(text) as unknown }
  } catch {
    return { error: 'bad_json' as const }
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

function requireAdmin(request: Request) {
  if (readAdmin(request)) return null
  return fail(request, 'unauthorized', 401)
}

async function handleLogin(request: Request) {
  if (limited(request, 'POST /api/login')) return fail(request, 'too_many', 429)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  if (!credentialsConfigured()) return fail(request, 'auth_off', 503, parsed.value)
  const body = parsed.value as { user?: unknown; password?: unknown } | null
  const user = typeof body?.user === 'string' ? body.user.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!user || !password) return fail(request, 'auth_need', 400, body)
  if (!checkCredentials(user, password)) return fail(request, 'auth_bad', 401, body)
  return json({ token: issueToken(user) }, 200, request)
}

async function handleVisits(request: Request) {
  const store = getStore()
  if (request.method === 'GET') {
    const denied = requireAdmin(request)
    if (denied) return denied
    const stats = await store.getStats()
    return json({ ...stats, store: store.kind }, 200, request)
  }
  if (limited(request, 'POST /api/visits')) return fail(request, 'too_many', 429)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  const body = parsed.value as { visitorId?: unknown; sessionId?: unknown } | null
  const visitorId = body?.visitorId
  const sessionId = body?.sessionId
  if (!uuidLike(visitorId) || !uuidLike(sessionId)) {
    return fail(request, 'bad_visit', 400, body)
  }
  await store.recordVisit(visitorId, sessionId)
  return json({ ok: true, store: store.kind }, 200, request)
}

async function handleWaitlist(request: Request) {
  const store = getStore()
  if (request.method === 'GET') {
    const denied = requireAdmin(request)
    if (denied) return denied
    const entries = await store.listWaitlist()
    return json({ entries, store: store.kind }, 200, request)
  }
  if (limited(request, 'POST /api/waitlist')) return fail(request, 'too_many', 429)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  const locale = localeFromRequest(request, parsed.value)
  const valid = validateWaitlistInput(parsed.value)
  if (typeof valid === 'string') return fail(request, valid, 400, parsed.value)
  const result = await store.requestWaitlist(valid)
  if (result.status === 'updated') {
    return json({ updated: true, store: store.kind }, 200, request)
  }
  const link = `${publicAppUrl(request)}/confirm?token=${result.token}`
  const sent = await sendWaitlistConfirm({ to: result.email, code: result.code || '', link, locale })
  if (!sent.ok && isProduction() && !sent.skipped) {
    return fail(request, 'mail_fail', 503, parsed.value)
  }
  if (!sent.ok && sent.skipped && isProduction()) {
    return fail(request, 'mail_off', 503, parsed.value)
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
  if (limited(request, 'POST /api/confirm')) return fail(request, 'too_many', 429)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  const body = parsed.value as { token?: unknown; email?: unknown; code?: unknown } | null
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!token && !(email && code)) return fail(request, 'confirm_need', 400, body)
  const result = await getStore().confirmWaitlist({
    token: token || undefined,
    email: email || undefined,
    code: code || undefined,
  })
  if (typeof result === 'string') return fail(request, result, 400, body)
  return json({ confirmed: true, email: result.email, intent: result.intent, store: getStore().kind }, 200, request)
}

async function handleConfirmStatus(request: Request) {
  if (limited(request, 'POST /api/confirm-status')) return fail(request, 'too_many', 429)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  const email = typeof (parsed.value as { email?: unknown } | null)?.email === 'string'
    ? (parsed.value as { email: string }).email
    : ''
  if (!email) return fail(request, 'email_need', 400, parsed.value)
  const confirmed = await getStore().isConfirmed(normalizeEmail(email))
  return json({ confirmed, store: getStore().kind }, 200, request)
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
    if (path === '/api/waitlist' && (request.method === 'GET' || request.method === 'POST')) {
      return handleWaitlist(request)
    }
    if (path === '/api/login' && request.method === 'POST') return handleLogin(request)
    if (path === '/api/confirm' && request.method === 'POST') return handleConfirm(request)
    if (path === '/api/confirm-status' && request.method === 'POST') return handleConfirmStatus(request)
  } catch {
    return fail(request, 'server', 500)
  }

  if (path.startsWith('/api/')) return fail(request, 'not_found', 404)
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
