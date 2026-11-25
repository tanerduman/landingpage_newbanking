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
import { isProduction, normalizeEmail, publicAppUrl, sendRequestReceipt, sendWaitlistConfirm } from './email.ts'
import { CONFIRM_CODE_RE, CONFIRM_EMAIL_ATTEMPTS, CONFIRM_TTL_MS } from '../src/confirmCode.ts'
import { getFxRates } from './fx.ts'
import { getGoldPrice } from './gold.ts'
import { apiError, localeFromRequest, type ApiLocale } from './i18n.ts'
import {
  getStore,
  sectorIdOk,
  sectorLabels,
  validateInterestInput,
  validateSupportInput,
  validateWaitlistInput,
} from './store.ts'
import { validatePlanCatalog } from './planCatalog.ts'
import { validateHeroCopy } from './heroCopy.ts'
import { validatePopupCatalog } from './popupCopy.ts'
import { listFilmSlots, pickFilmUrl, filmEventType, receiveFilmUpload } from './film.ts'

const PROD_ORIGINS = new Set(['https://www.getaure.org', 'https://getaure.org'])
const LOCAL_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])

function corsOriginAllowed(origin: string) {
  if (PROD_ORIGINS.has(origin)) return true
  return !isProduction() && LOCAL_ORIGINS.has(origin)
}

function firstHop(header: string | null) {
  if (!header) return ''
  const hop = header.split(',')[0]?.trim() ?? ''
  return hop.slice(0, 80)
}

function confirmLink(request: Request, token?: string) {
  const base = `${publicAppUrl(request)}/confirm`
  if (!token) return base
  return `${base}?token=${encodeURIComponent(token)}`
}

function clientKey(request: Request) {
  const vercel = firstHop(request.headers.get('x-vercel-forwarded-for'))
  if (vercel) return vercel
  const forwarded = firstHop(request.headers.get('x-forwarded-for'))
  if (forwarded) return forwarded
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real.slice(0, 80)
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
  return json({ error: apiError(code, locale) }, status, request)
}

function applyCors(request: Request, headers: Headers) {
  const origin = request.headers.get('origin')
  if (origin && corsOriginAllowed(origin)) {
    headers.set('access-control-allow-origin', origin)
    headers.set('vary', 'Origin')
    headers.set('access-control-allow-credentials', 'true')
    headers.set('access-control-allow-headers', 'Content-Type, x-is-human, x-path, x-method')
    headers.set('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS')
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

function isPlanCatalogWrite(value: unknown) {
  return Boolean(value && typeof value === 'object' && 'planCatalog' in value && (value as { planCatalog?: unknown }).planCatalog === true)
}

function isFitWrite(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const data = value as { fitOpen?: unknown }
  return typeof data.fitOpen === 'boolean' && Object.keys(data).length === 1
}

function isInvestorsWrite(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const data = value as { investorsOpen?: unknown }
  return typeof data.investorsOpen === 'boolean' && Object.keys(data).length === 1
}

function isHeroCopyWrite(value: unknown) {
  return Boolean(value && typeof value === 'object' && 'heroCopy' in value && (value as { heroCopy?: unknown }).heroCopy === true)
}

function isPopupCatalogWrite(value: unknown) {
  return Boolean(value && typeof value === 'object' && 'popupCatalog' in value && (value as { popupCatalog?: unknown }).popupCatalog === true)
}

function isPopupSeenWrite(value: unknown) {
  return Boolean(value && typeof value === 'object' && 'popupSeen' in value && (value as { popupSeen?: unknown }).popupSeen === true)
}

function waitlistId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

async function readJson(request: Request, max = 8_000) {
  const length = Number(request.headers.get('content-length') || '0')
  if (length > max) return { error: 'too_big' as const }
  const text = await request.text()
  if (text.length > max) return { error: 'too_big' as const }
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

async function adminPresent(request: Request) {
  if (!credentialsConfigured()) return false
  const id = readCookie(request, ADMIN_COOKIE)
  if (!id) return false
  const session = await getStore().readAdminSession(sessionKey(id), passwordFingerprint())
  return Boolean(session)
}

async function requireAdmin(request: Request) {
  if (!(await adminPresent(request))) return fail(request, 'unauthorized', 401)
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
    return json(stats, 200, request)
  }
  if (await adminPresent(request)) return json({ ok: true }, 200, request)
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
  return json({ ok: true }, 200, request)
}

async function handleWaitlist(request: Request) {
  const store = getStore()
  if (request.method === 'GET' && new URL(request.url).searchParams.get('fit') === '1') {
    if (await overLimit(`fit:list:${clientKey(request)}`, 120, 60_000)) return fail(request, 'too_many', 429)
    return json({ open: await store.getFitOpen() }, 200, request)
  }
  if (request.method === 'GET' && new URL(request.url).searchParams.get('investors') === '1') {
    if (await overLimit(`investors:list:${clientKey(request)}`, 120, 60_000)) return fail(request, 'too_many', 429)
    return json({ open: await store.getInvestorsOpen() }, 200, request)
  }
  if (request.method === 'GET' && new URL(request.url).searchParams.get('plans') === '1') {
    if (await overLimit(`plans:list:${clientKey(request)}`, 120, 60_000)) return fail(request, 'too_many', 429)
    return json({ plans: await store.getPlanCatalog() }, 200, request)
  }
  if (request.method === 'GET' && new URL(request.url).searchParams.get('film') === '1') {
    if (await overLimit(`film:list:${clientKey(request)}`, 120, 60_000)) return fail(request, 'too_many', 429)
    const copy = await store.getHeroCopy()
    const slots = await listFilmSlots()
    return json({ url: pickFilmUrl(slots, copy.filmSlot), slot: copy.filmSlot, slots }, 200, request)
  }
  if (request.method === 'GET' && new URL(request.url).searchParams.get('hero') === '1') {
    if (await overLimit(`hero:list:${clientKey(request)}`, 120, 60_000)) return fail(request, 'too_many', 429)
    return json({ hero: await store.getHeroCopy() }, 200, request)
  }
  if (request.method === 'GET' && new URL(request.url).searchParams.get('ask') === '1') {
    if (await overLimit(`popup:next:${clientKey(request)}`, 60, 60_000)) return fail(request, 'too_many', 429)
    const visitor = new URL(request.url).searchParams.get('visitor')
    if (!uuidLike(visitor)) return fail(request, 'bad_visit', 400)
    return json({ next: await store.nextPopup(visitor) }, 200, request)
  }
  if (request.method === 'GET' && new URL(request.url).searchParams.get('popups') === '1') {
    const denied = await requireAdmin(request)
    if (denied) return denied
    if (await overLimit(`popup:list:${clientKey(request)}`, 120, 60_000)) return fail(request, 'too_many', 429)
    return json({ popups: await store.getPopups(), stats: await store.popupStats() }, 200, request)
  }
  if (request.method === 'GET') {
    const denied = await requireAdmin(request)
    if (denied) return denied
    const entries = await store.listWaitlist()
    return json({ entries }, 200, request)
  }
  if (request.method === 'PATCH') {
    const denied = await requireAdmin(request)
    if (denied) return denied
    const parsed = await readJson(request, 40_000)
    if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
    if (isFitWrite(parsed.value)) {
      if (await overLimit(`fit:write:${clientKey(request)}`, 30, 60_000)) return fail(request, 'too_many', 429)
      const open = await store.setFitOpen((parsed.value as { fitOpen: boolean }).fitOpen)
      return json({ open }, 200, request)
    }
    if (isInvestorsWrite(parsed.value)) {
      if (await overLimit(`investors:write:${clientKey(request)}`, 30, 60_000)) return fail(request, 'too_many', 429)
      const open = await store.setInvestorsOpen((parsed.value as { investorsOpen: boolean }).investorsOpen)
      return json({ open }, 200, request)
    }
    if (isPopupCatalogWrite(parsed.value)) {
      if (await overLimit(`popup:write:${clientKey(request)}`, 30, 60_000)) return fail(request, 'too_many', 429)
      const popups = validatePopupCatalog(parsed.value)
      if (typeof popups === 'string') return fail(request, popups, 400, parsed.value)
      const saved = await store.savePopups(popups)
      return json({ popups: saved, stats: await store.popupStats() }, 200, request)
    }
    if (isHeroCopyWrite(parsed.value)) {
      if (await overLimit(`hero:write:${clientKey(request)}`, 30, 60_000)) return fail(request, 'too_many', 429)
      const copy = validateHeroCopy(parsed.value)
      if (typeof copy === 'string') return fail(request, copy, 400, parsed.value)
      const saved = await store.saveHeroCopy(copy)
      return json({ hero: saved }, 200, request)
    }
    if (isPlanCatalogWrite(parsed.value)) {
      if (await overLimit(`plans:write:${clientKey(request)}`, 30, 60_000)) return fail(request, 'too_many', 429)
      const catalog = validatePlanCatalog(parsed.value)
      if (typeof catalog === 'string') return fail(request, catalog, 400, parsed.value)
      const saved = await store.savePlanCatalog(catalog)
      return json({ plans: saved }, 200, request)
    }
    if (await overLimit(`waitlist-read:ip:${clientKey(request)}`, 80, 60_000)) return fail(request, 'too_many', 429)
    const body = parsed.value as { id?: unknown; read?: unknown } | null
    if (!waitlistId(body?.id) || typeof body.read !== 'boolean') return fail(request, 'invalid', 400, parsed.value)
    const updated = await store.setWaitlistRead(body.id, body.read)
    if (!updated) return fail(request, 'not_found', 404, parsed.value)
    return json({ ok: true, read: body.read }, 200, request)
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
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  if (isPopupSeenWrite(parsed.value)) {
    const body = parsed.value as { id?: unknown; visitorId?: unknown; answer?: unknown }
    const answer = body.answer == null ? null : body.answer === 'yes' || body.answer === 'no' ? body.answer : null
    if ((body.answer != null && !answer) || typeof body.id !== 'string' || !uuidLike(body.visitorId)) {
      return fail(request, 'invalid', 400, parsed.value)
    }
    if (await overLimit(`popup:seen:${clientKey(request)}`, 40, 600_000)) return fail(request, 'too_many', 429)
    if (await overLimit(`popup:visitor:${body.visitorId}`, 16, 600_000)) return fail(request, 'too_many', 429)
    const result = await store.markPopupSeen({ popupId: body.id, visitorId: body.visitorId, answer })
    if (result === 'not_found') return fail(request, 'not_found', 404, parsed.value)
    return json({ ok: true }, 200, request)
  }
  if (await overLimit(`waitlist:ip:${clientKey(request)}`, 20, 600_000)) return fail(request, 'too_many', 429)
  const locale = localeFromRequest(request, parsed.value)
  const valid = validateWaitlistInput(parsed.value)
  if (typeof valid === 'string') return fail(request, valid, 400, parsed.value)
  if (await overLimit(`waitlist:email:${valid.emailNorm}`, 20, 600_000)) return fail(request, 'too_many', 429)
  const result = await store.requestWaitlist(valid)
  if (result.status === 'updated') {
    return json({ ok: true, updated: true }, 200, request)
  }
  const link = confirmLink(request, result.token)
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
  return json(
    {
      pending: true,
      statusToken: result.statusToken,
      ...(!sent.ok ? { devCode: result.code } : {}),
    },
    200,
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
  if (email && code) {
    if (!CONFIRM_CODE_RE.test(code)) return fail(request, 'confirm_need', 400, body)
    if (await overLimit(`confirm:email:${normalizeEmail(email)}`, CONFIRM_EMAIL_ATTEMPTS, CONFIRM_TTL_MS)) {
      return fail(request, 'too_many', 429)
    }
  }
  const lookup = {
    token: token || undefined,
    email: email || undefined,
    code: code || undefined,
  }
  const locale = localeFromRequest(request, parsed.value)
  const waitlist = await getStore().confirmWaitlist(lookup)
  if (typeof waitlist !== 'string') {
    await sendRequestReceipt({
      to: waitlist.email,
      locale,
      detail: { purpose: 'waitlist', name: waitlist.name, intent: waitlist.intent, cycle: waitlist.cycle },
    })
    return json(
      { confirmed: true, purpose: 'waitlist', email: waitlist.email, intent: waitlist.intent },
      200,
      request,
    )
  }
  const support = await getStore().confirmSupport(lookup)
  if (typeof support === 'string') return fail(request, support, 400, body)
  await sendRequestReceipt({
    to: support.email,
    locale,
    detail: { purpose: 'support', name: support.name, kind: support.kind, message: support.message },
  })
  return json({ confirmed: true, purpose: 'support' }, 200, request)
}

function isSectorWrite(value: unknown) {
  return Boolean(value && typeof value === 'object' && 'labelTr' in value && !('email' in value))
}

async function handleInterest(request: Request) {
  const store = getStore()
  const catalogView = new URL(request.url).searchParams.get('catalog') === '1'
  if (request.method === 'GET' && catalogView) {
    if (await overLimit(`sectors:list:${clientKey(request)}`, 120, 60_000)) return fail(request, 'too_many', 429)
    return json({ sectors: await store.listSectors() }, 200, request)
  }
  if (request.method === 'GET') {
    const denied = await requireAdmin(request)
    if (denied) return denied
    if (await overLimit(`interest:list:${clientKey(request)}`, 120, 60_000)) return fail(request, 'too_many', 429)
    return json({ entries: await store.listInterests() }, 200, request)
  }
  if (request.method === 'PATCH' || request.method === 'DELETE') {
    const denied = await requireAdmin(request)
    if (denied) return denied
    if (await overLimit(`sectors:write:${clientKey(request)}`, 40, 60_000)) return fail(request, 'too_many', 429)
    const parsed = await readJson(request)
    if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
    const id = (parsed.value as { id?: unknown } | null)?.id
    if (!sectorIdOk(id)) return fail(request, 'invalid', 400, parsed.value)
    if (request.method === 'DELETE') {
      const removed = await store.deleteSector(id)
      if (!removed) return fail(request, 'not_found', 404, parsed.value)
      return json({ ok: true }, 200, request)
    }
    const labels = sectorLabels(parsed.value)
    if (typeof labels === 'string') return fail(request, labels, 400, parsed.value)
    const updated = await store.updateSector({ id, ...labels })
    if (updated === 'not_found') return fail(request, 'not_found', 404, parsed.value)
    return json({ sector: updated }, 200, request)
  }
  if (request.method !== 'POST') return fail(request, 'invalid', 405)
  if (await overLimit(`interest:ip:${clientKey(request)}`, 20, 300_000)) return fail(request, 'too_many', 429)
  const parsed = await readJson(request)
  if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
  if (isSectorWrite(parsed.value)) {
    const denied = await requireAdmin(request)
    if (denied) return denied
    if (await overLimit(`sectors:write:${clientKey(request)}`, 40, 60_000)) return fail(request, 'too_many', 429)
    const labels = sectorLabels(parsed.value)
    if (typeof labels === 'string') return fail(request, labels, 400, parsed.value)
    const created = await store.createSector(labels)
    if (created === 'sector_limit') return fail(request, 'sector_limit', 400, parsed.value)
    return json({ sector: created }, 200, request)
  }
  const catalog = await store.listSectors()
  const input = validateInterestInput(parsed.value, new Set(catalog.map((sector) => sector.id)))
  if (typeof input === 'string') return fail(request, input, 400, parsed.value)
  if (await overLimit(`interest:email:${input.emailNorm}`, 8, 300_000)) return fail(request, 'too_many', 429)
  const saved = await store.saveInterest(input)
  if (saved === 'not_confirmed') return fail(request, 'not_confirmed', 400, parsed.value)
  return json({ ok: true }, 200, request)
}

async function handleSupport(request: Request) {
  const store = getStore()
  if (request.method === 'GET') {
    const denied = await requireAdmin(request)
    if (denied) return denied
    const entries = await store.listSupport()
    return json({ entries }, 200, request)
  }
  if (request.method === 'PATCH') {
    const denied = await requireAdmin(request)
    if (denied) return denied
    if (await overLimit(`support-read:ip:${clientKey(request)}`, 80, 60_000)) return fail(request, 'too_many', 429)
    const parsed = await readJson(request)
    if ('error' in parsed && parsed.error) return fail(request, parsed.error, 400)
    const body = parsed.value as { id?: unknown; read?: unknown } | null
    if (!waitlistId(body?.id) || typeof body.read !== 'boolean') return fail(request, 'invalid', 400, parsed.value)
    const updated = await store.setSupportRead(body.id, body.read)
    if (!updated) return fail(request, 'not_found', 404, parsed.value)
    return json({ ok: true, read: body.read }, 200, request)
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
  const link = confirmLink(request, result.token)
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

async function routeFilmUpload(request: Request, path: string) {
  if (request.method !== 'POST' || path !== '/api/waitlist') return null
  const length = Number(request.headers.get('content-length') || '0')
  if (length > 20_000) return null
  let body: unknown
  try {
    body = await request.clone().json()
  } catch {
    return null
  }
  const type = filmEventType(body)
  if (!type) return null
  if (type === 'blob.generate-client-token' || type === 'blob.generate-presigned-url') {
    const denied = await rejectBot(request, path)
    if (denied) return denied
    if (!(await adminPresent(request))) return fail(request, 'unauthorized', 401)
  }
  try {
    const result = await receiveFilmUpload(body, request, () => adminPresent(request))
    return json(result, 200, request)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'unauthorized') return json({ error: 'unauthorized' }, 401, request)
    if (message === 'film_type') return json({ error: 'film_type' }, 400, request)
    if (message && !/vercel_blob|eyJ/i.test(message)) console.error('film upload', message.slice(0, 160))
    return json({ error: 'film_fail' }, 400, request)
  }
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
    const filmUpload = await routeFilmUpload(request, path)
    if (filmUpload) return filmUpload
    const denied = await rejectBot(request, path)
    if (denied) return denied
    if (path === '/api/health' && request.method === 'GET') return handleHealth(request)
    if (path === '/api/rates' && request.method === 'GET') return handleRates(request)
    if (path === '/api/gold' && request.method === 'GET') return handleGold(request)
    if (path === '/api/visits' && (request.method === 'GET' || request.method === 'POST')) {
      return handleVisits(request)
    }
    if (
      path === '/api/waitlist' &&
      (request.method === 'GET' || request.method === 'POST' || request.method === 'PATCH' || request.method === 'DELETE')
    ) {
      return handleWaitlist(request)
    }
    if (path === '/api/login' && request.method === 'POST') return handleLogin(request)
    if (path === '/api/logout' && request.method === 'POST') return handleLogout(request)
    if (
      path === '/api/support' &&
      (request.method === 'GET' || request.method === 'POST' || request.method === 'PATCH' || request.method === 'DELETE')
    ) {
      return handleSupport(request)
    }
    if (
      path === '/api/interest' &&
      (request.method === 'GET' || request.method === 'POST' || request.method === 'PATCH' || request.method === 'DELETE')
    ) {
      return handleInterest(request)
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
