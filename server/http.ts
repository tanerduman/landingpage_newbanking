import { checkBotId } from 'botid/server'
import { botProtectedRoutes } from '../src/botProtection.ts'
import {
  credentialsConfigured,
  checkCredentials,
  newSessionId,
  passwordFingerprint,
  readCookie,
  ADMIN_COOKIE,
  ADMIN_TTL_MS,
  sessionCookie,
  sessionKey,
} from './auth.ts'
import { isProduction, publicAppUrl, sendWaitlistConfirm } from './email.ts'
import { getFxRates } from './fx.ts'
import { getGoldPrice } from './gold.ts'
import { apiError, localeFromRequest, type ApiLocale } from './i18n.ts'
import { getStore, validateSupportInput, validateWaitlistInput } from './store.ts'

const ALLOWED_ORIGINS = new Set([
  'https://www.getaure.org',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])

function clientKey(request: Request) {
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real.slice(0, 80)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean)
    const last = parts[parts.length - 1]
    if (last) return last.slice(0, 80)
  }
  return 'unknown'
}

async function overLimit(key: string, limit: number, windowMs: number) {
  return getStore().hitRateLimit(key, limit, windowMs)
}

function json(data: unknown, status = 200, request?: Request, cookies?: string[]) {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' })
  if (request) applyCors(request, headers)
  for (const cookie of cookies ?? []) headers.append('set-cookie', cookie)
  return new Response(JSON.stringify(data), { status, headers })
}

function fail(request: Request, code: string, status: number, body?: unknown) {
  const locale: ApiLocale = localeFromRequest(request, body)
  return json({ error: apiError(code, locale), code }, status, request)
}

function applyCors(request: Request, headers: Headers) {
  const origin = request.headers.get('origin')
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('access-control-allow-origin', origin)
    headers.set('vary', 'Origin')
    headers.set('access-control-allow-credentials', 'true')
    headers.set('access-control-allow-headers', 'Content-Type, x-is-human, x-path, x-method')
    headers.set('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS')
  }
}

function protectedRoute(method: string, path: string) {
  return botProtectedRoutes.find(
    (route) => route.path === path && route.method.toUpperCase() === method.toUpperCase(),
  )
}

async function rejectBot(request: Request, path: string) {
  const route = protectedRoute(request.method, path)
  if (!route) return null
  const verification = await checkBotId({
    developmentOptions: process.env.VERCEL ? undefined : { isDevelopment: true, bypass: 'HUMAN' },
    advancedOptions: { checkLevel: route.advancedOptions.checkLevel },
  })
  if (verification.isBot) return fail(request, 'bot', 403)
  return null
}

function uuidLike(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f-]{8,80}$/i.test(value)
}

function waitlistId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
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
  return json({ ok: true }, 200, request)
}

async function handleRates(request: Request) {
  if (await overLimit(`rates:ip:${clientKey(request)}`, 30, 60_000)) return fail(request, 'too_many', 429)
  const result = await getFxRates()
  if (!result.ok) {
    return json({ error: result.code }, result.status, request)
  }
  return json(result.payload, 200, request)
}

async function handleGold(request: Request) {
  if (await overLimit(`gold:ip:${clientKey(request)}`, 30, 60_000)) return fail(request, 'too_many', 429)
  const result = await getGoldPrice()
  if (!result.ok) {
    return json({ error: result.code }, result.status, request)
  }
  return json(result.payload, 200, request)
}

async function requireAdmin(request: Request) {
  if (!credentialsConfigured()) return fail(request, 'unauthorized', 401)
  const id = readCookie(request, ADMIN_COOKIE)
  if (!id) return fail(request, 'unauthorized', 401)
  const session = await getStore().readAdminSession(sessionKey(id), passwordFingerprint())
  if (!session) return fail(request, 'unauthorized', 401)
  return null
}

async function handleLogin(request: Request) {
  const ip = clientKey(request)
  if (await overLimit(`login:ip:${ip}`, 10, 300_000)) return fail(request, 'too_many', 429)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  if (!credentialsConfigured()) return fail(request, 'auth_off', 503, parsed.value)
  const body = parsed.value as { user?: unknown; password?: unknown } | null
  const user = typeof body?.user === 'string' ? body.user.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!user || !password) return fail(request, 'auth_need', 400, body)
  if (await overLimit(`login:user:${user.toLowerCase()}`, 10, 300_000)) return fail(request, 'too_many', 429)
  if (!checkCredentials(user, password)) return fail(request, 'auth_bad', 401, body)
  const id = newSessionId()
  await getStore().createAdminSession({
    user,
    passwordHash: passwordFingerprint(),
    idHash: sessionKey(id),
    expiresAt: new Date(Date.now() + ADMIN_TTL_MS).toISOString(),
  })
  return json({ ok: true }, 200, request, [sessionCookie(id, request)])
}

async function handleLogout(request: Request) {
  const id = readCookie(request, ADMIN_COOKIE)
  if (id && credentialsConfigured()) await getStore().deleteAdminSession(sessionKey(id))
  return json({ ok: true }, 200, request, [sessionCookie('', request, true)])
}

async function handleVisits(request: Request) {
  const store = getStore()
  if (request.method === 'GET') {
    const denied = await requireAdmin(request)
    if (denied) return denied
    const stats = await store.getStats()
    return json({ ...stats, store: store.kind }, 200, request)
  }
  if (await overLimit(`visits:ip:${clientKey(request)}`, 120, 60_000)) return fail(request, 'too_many', 429)
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
    const denied = await requireAdmin(request)
    if (denied) return denied
    const entries = await store.listWaitlist()
    return json({ entries, store: store.kind }, 200, request)
  }
  if (request.method === 'DELETE') {
    const denied = await requireAdmin(request)
    if (denied) return denied
    if (await overLimit(`waitlist-delete:ip:${clientKey(request)}`, 40, 60_000)) return fail(request, 'too_many', 429)
    const parsed = await readJson(request)
    if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
    const id = (parsed.value as { id?: unknown } | null)?.id
    if (!waitlistId(id)) return fail(request, 'invalid', 400, parsed.value)
    const removed = await store.deleteWaitlist(id)
    if (!removed) return fail(request, 'not_found', 404, parsed.value)
    return json({ ok: true }, 200, request)
  }
  if (await overLimit(`waitlist:ip:${clientKey(request)}`, 20, 600_000)) return fail(request, 'too_many', 429)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  const locale = localeFromRequest(request, parsed.value)
  const valid = validateWaitlistInput(parsed.value)
  if (typeof valid === 'string') return fail(request, valid, 400, parsed.value)
  if (await overLimit(`waitlist:email:${valid.emailNorm}`, 20, 600_000)) return fail(request, 'too_many', 429)
  const result = await store.requestWaitlist(valid)
  if (result.status === 'updated') {
    return json({ updated: true, store: store.kind }, 200, request)
  }
  const link = `${publicAppUrl(request)}/confirm`
  const sent = await sendWaitlistConfirm({
    to: result.email,
    code: result.code || '',
    link,
    locale,
    purpose: 'waitlist',
  })
  if (!sent.ok && isProduction() && !sent.skipped) {
    return fail(request, 'mail_fail', 503, parsed.value)
  }
  if (!sent.ok && sent.skipped && isProduction()) {
    return fail(request, 'mail_off', 503, parsed.value)
  }
  const localDev = !process.env.VERCEL
  return json(
    {
      pending: true,
      delivered: sent.ok,
      statusToken: result.statusToken,
      store: store.kind,
      ...(localDev && !sent.ok ? { devCode: result.code } : {}),
    },
    201,
    request,
  )
}

async function handleConfirm(request: Request) {
  if (await overLimit(`confirm:ip:${clientKey(request)}`, 15, 600_000)) return fail(request, 'too_many', 429)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  const body = parsed.value as { token?: unknown; email?: unknown; code?: unknown } | null
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!token && !(email && code)) return fail(request, 'confirm_need', 400, body)
  const lookup = {
    token: token || undefined,
    email: email || undefined,
    code: code || undefined,
  }
  const waitlist = await getStore().confirmWaitlist(lookup)
  if (typeof waitlist !== 'string') {
    return json(
      { confirmed: true, email: waitlist.email, intent: waitlist.intent, purpose: 'waitlist', store: getStore().kind },
      200,
      request,
    )
  }
  const support = await getStore().confirmSupport(lookup)
  if (typeof support === 'string') return fail(request, support, 400, body)
  return json(
    { confirmed: true, email: support.email, kind: support.kind, purpose: 'support', store: getStore().kind },
    200,
    request,
  )
}

async function handleSupport(request: Request) {
  const store = getStore()
  if (request.method === 'GET') {
    const denied = await requireAdmin(request)
    if (denied) return denied
    const entries = await store.listSupport()
    return json({ entries, store: store.kind }, 200, request)
  }
  if (request.method === 'DELETE') {
    const denied = await requireAdmin(request)
    if (denied) return denied
    if (await overLimit(`support-delete:ip:${clientKey(request)}`, 40, 60_000)) return fail(request, 'too_many', 429)
    const parsed = await readJson(request)
    if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
    const id = (parsed.value as { id?: unknown } | null)?.id
    if (!waitlistId(id)) return fail(request, 'invalid', 400, parsed.value)
    const removed = await store.deleteSupport(id)
    if (!removed) return fail(request, 'not_found', 404, parsed.value)
    return json({ ok: true }, 200, request)
  }
  if (await overLimit(`support:ip:${clientKey(request)}`, 20, 600_000)) return fail(request, 'too_many', 429)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  const locale = localeFromRequest(request, parsed.value)
  const valid = validateSupportInput(parsed.value)
  if (typeof valid === 'string') return fail(request, valid, 400, parsed.value)
  if (await overLimit(`support:email:${valid.emailNorm}`, 20, 600_000)) return fail(request, 'too_many', 429)
  const result = await store.requestSupport(valid)
  const link = `${publicAppUrl(request)}/confirm`
  const sent = await sendWaitlistConfirm({
    to: result.email,
    code: result.code || '',
    link,
    locale,
    purpose: 'support',
  })
  if (!sent.ok && isProduction() && !sent.skipped) {
    return fail(request, 'mail_fail', 503, parsed.value)
  }
  if (!sent.ok && sent.skipped && isProduction()) {
    return fail(request, 'mail_off', 503, parsed.value)
  }
  const localDev = !process.env.VERCEL
  return json(
    {
      pending: true,
      delivered: sent.ok,
      statusToken: result.statusToken,
      store: store.kind,
      ...(localDev && !sent.ok ? { devCode: result.code } : {}),
    },
    201,
    request,
  )
}

async function handleConfirmStatus(request: Request) {
  if (await overLimit(`status:ip:${clientKey(request)}`, 60, 60_000)) return fail(request, 'too_many', 429)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  const statusToken =
    typeof (parsed.value as { statusToken?: unknown } | null)?.statusToken === 'string'
      ? (parsed.value as { statusToken: string }).statusToken.trim()
      : ''
  if (statusToken.length < 20 || statusToken.length > 200) return json({ confirmed: false }, 200, request)
  const confirmed = await getStore().confirmStatus(statusToken)
  return json({ confirmed }, 200, request)
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
    const denied = await rejectBot(request, path)
    if (denied) return denied
    if (path === '/api/health' && request.method === 'GET') return handleHealth(request)
    if (path === '/api/rates' && request.method === 'GET') return handleRates(request)
    if (path === '/api/gold' && request.method === 'GET') return handleGold(request)
    if (path === '/api/visits' && (request.method === 'GET' || request.method === 'POST')) {
      return handleVisits(request)
    }
    if (path === '/api/waitlist' && (request.method === 'GET' || request.method === 'POST' || request.method === 'DELETE')) {
      return handleWaitlist(request)
    }
    if (path === '/api/login' && request.method === 'POST') return handleLogin(request)
    if (path === '/api/logout' && request.method === 'POST') return handleLogout(request)
    if (path === '/api/support' && (request.method === 'GET' || request.method === 'POST' || request.method === 'DELETE')) {
      return handleSupport(request)
    }
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
