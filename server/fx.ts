const ENDPOINT = 'https://api.freecurrencyapi.com/v1/latest'
const PAIRS = ['USD', 'EUR', 'GBP', 'CHF'] as const
const CACHE_MS = 30 * 60 * 1000

export type FxQuote = {
  base: (typeof PAIRS)[number]
  quote: 'TRY'
  rate: number
}

export type FxPayload = {
  quotes: FxQuote[]
  source: 'freecurrencyapi'
  asOf: string
}

type Cache = { at: number; payload: FxPayload }

const globalFx = globalThis as typeof globalThis & { __aureFx?: Cache }

function apiKey() {
  return process.env.FREECURRENCYAPI_KEY || ''
}

export async function getFxRates(): Promise<{ ok: true; payload: FxPayload } | { ok: false; status: number; code: string }> {
  const cached = globalFx.__aureFx
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return { ok: true, payload: cached.payload }
  }

  const key = apiKey()
  if (!key) {
    console.error('freecurrencyapi error.code missing_key')
    return { ok: false, status: 503, code: 'missing_key' }
  }

  const url = `${ENDPOINT}?base_currency=USD&currencies=TRY,EUR,GBP,CHF`
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 8000)
  let response: Response
  try {
    response = await fetch(url, {
      headers: { apikey: key },
      signal: ac.signal,
    })
  } catch {
    console.error('freecurrencyapi error.code network')
    return { ok: false, status: 502, code: 'network' }
  } finally {
    clearTimeout(timer)
  }

  const body = (await response.json().catch(() => null)) as {
    data?: Record<string, number>
    error?: { code?: string }
  } | null
  const code = body?.error?.code || `http_${response.status}`
  if (!response.ok) {
    console.error(`freecurrencyapi error.code ${code}`)
    return { ok: false, status: response.status, code }
  }

  const usdTry = Number(body?.data?.TRY)
  const eur = Number(body?.data?.EUR)
  const gbp = Number(body?.data?.GBP)
  const chf = Number(body?.data?.CHF)
  if (!usdTry) {
    console.error('freecurrencyapi error.code invalid_payload')
    return { ok: false, status: 502, code: 'invalid_payload' }
  }

  const quotes: FxQuote[] = [
    { base: 'USD', quote: 'TRY', rate: usdTry },
    { base: 'EUR', quote: 'TRY', rate: eur ? usdTry / eur : 0 },
    { base: 'GBP', quote: 'TRY', rate: gbp ? usdTry / gbp : 0 },
    { base: 'CHF', quote: 'TRY', rate: chf ? usdTry / chf : 0 },
  ].filter((row) => row.rate > 0)

  const payload: FxPayload = {
    quotes,
    source: 'freecurrencyapi',
    asOf: new Date().toISOString(),
  }
  globalFx.__aureFx = { at: Date.now(), payload }
  return { ok: true, payload }
}
