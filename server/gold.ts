const ENDPOINT = 'https://api.collectapi.com/economy/goldPrice'
const CACHE_MS = 10 * 60 * 1000

export type GoldPayload = {
  gramTry: number
  name: string
  source: 'collectapi'
  asOf: string
}

type Cache = { at: number; payload: GoldPayload }

const globalGold = globalThis as typeof globalThis & { __aureGold?: Cache }

function apiKey() {
  return process.env.COLLECTAPI_KEY || ''
}

export function parseTry(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value !== 'string') return 0
  const trimmed = value.trim()
  if (!trimmed) return 0
  const normalized =
    trimmed.includes(',') && trimmed.includes('.')
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed.includes(',')
        ? trimmed.replace(',', '.')
        : trimmed
  const amount = Number(normalized)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function rowName(row: Record<string, unknown>) {
  const name = row.name ?? row.Name ?? row.title ?? row.code
  return typeof name === 'string' ? name : ''
}

function isGramGold(name: string) {
  const folded = name.toLocaleLowerCase('tr-TR')
  if (folded === 'gra' || folded === 'gram-altin' || folded === 'gram-altın') return true
  return folded.includes('gram') && (folded.includes('alt') || folded.includes('gold'))
}

function sellingOf(row: Record<string, unknown>) {
  return (
    parseTry(row.selling) ||
    parseTry(row.sell) ||
    parseTry(row.satis) ||
    parseTry(row.sellingstr) ||
    parseTry(row.buying) ||
    parseTry(row.buy)
  )
}

export function pickGramSelling(body: unknown): { name: string; gramTry: number } | null {
  if (!body || typeof body !== 'object') return null
  const record = body as { success?: unknown; result?: unknown; data?: unknown }
  if (record.success === false) return null
  const rows = Array.isArray(record.result) ? record.result : Array.isArray(record.data) ? record.data : null
  if (!rows) return null
  for (const item of rows) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const name = rowName(row)
    if (!isGramGold(name)) continue
    const gramTry = sellingOf(row)
    if (gramTry > 0) return { name: name || 'Gram Altın', gramTry }
  }
  return null
}

export async function getGoldPrice(): Promise<
  { ok: true; payload: GoldPayload } | { ok: false; status: number; code: string }
> {
  const cached = globalGold.__aureGold
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return { ok: true, payload: cached.payload }
  }

  const key = apiKey()
  if (!key) {
    console.error('collectapi error.code missing_key')
    return { ok: false, status: 503, code: 'missing_key' }
  }

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 8000)
  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      headers: {
        authorization: `apikey ${key}`,
        'content-type': 'application/json',
      },
      signal: ac.signal,
    })
  } catch {
    console.error('collectapi error.code network')
    return { ok: false, status: 502, code: 'network' }
  } finally {
    clearTimeout(timer)
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    console.error(`collectapi error.code http_${response.status}`)
    return { ok: false, status: response.status, code: `http_${response.status}` }
  }

  const picked = pickGramSelling(body)
  if (!picked) {
    console.error('collectapi error.code invalid_payload')
    return { ok: false, status: 502, code: 'invalid_payload' }
  }

  const payload: GoldPayload = {
    gramTry: picked.gramTry,
    name: picked.name,
    source: 'collectapi',
    asOf: new Date().toISOString(),
  }
  globalGold.__aureGold = { at: Date.now(), payload }
  return { ok: true, payload }
}
