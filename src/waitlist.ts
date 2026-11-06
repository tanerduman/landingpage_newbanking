import { apiFetch, readApiJson } from './api.ts'
import { messages, readLocale, type Locale } from './i18n/index.ts'

export type PlanId = 'standard' | 'plus' | 'premium'
export type SignupIntent = 'account' | PlanId
export type BillingCycle = 'none' | 'monthly' | 'yearly'

export type WaitlistEntry = {
  id: string
  name: string
  email: string
  intent: SignupIntent
  cycle: BillingCycle
  createdAt: string
}

export const PACKAGE_LABELS: Record<SignupIntent, string> = {
  account: 'Temel (0 ₺)',
  standard: 'Standard',
  plus: 'Plus',
  premium: 'Premium',
}

export const PACKAGE_FILTERS: { id: 'all' | SignupIntent; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'account', label: 'Temel (0 ₺)' },
  { id: 'standard', label: 'Standard' },
  { id: 'plus', label: 'Plus' },
  { id: 'premium', label: 'Premium' },
]

export const CYCLE_LABELS: Record<BillingCycle, string> = {
  none: 'Temel',
  monthly: 'Aylık',
  yearly: 'Yıllık',
}

export const CYCLE_FILTERS: { id: 'all' | BillingCycle; label: string }[] = [
  { id: 'all', label: 'Tüm dönemler' },
  { id: 'monthly', label: 'Aylık' },
  { id: 'yearly', label: 'Yıllık' },
  { id: 'none', label: 'Temel' },
]

const KEY = 'aure-waitlist'

function normalizeEntry(row: WaitlistEntry): WaitlistEntry {
  const cycle: BillingCycle =
    row.cycle === 'yearly' || row.cycle === 'monthly' || row.cycle === 'none'
      ? row.cycle
      : row.intent === 'account'
        ? 'none'
        : 'monthly'
  return { ...row, cycle }
}

export function loadWaitlist(): WaitlistEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WaitlistEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function failMessage(remoteError: string | undefined, key: 'save_fail' | 'confirm_fail' | 'offline') {
  const t = messages(readLocale())
  return remoteError || t.errors[key]
}

export async function addWaitlistEntry(input: {
  name: string
  email: string
  intent: SignupIntent
  cycle: BillingCycle
  lang?: Locale
}) {
  const payload = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    intent: input.intent,
    cycle: input.intent === 'account' ? 'none' : input.cycle,
    lang: input.lang || readLocale(),
  }
  const res = await apiFetch('/api/waitlist', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const remote = await readApiJson<{
    pending?: boolean
    updated?: boolean
    delivered?: boolean
    devCode?: string
    error?: string
  }>(res)
  if (res?.ok && remote?.updated) {
    window.dispatchEvent(new Event('aure-waitlist'))
    return { status: 'updated' as const }
  }
  if (res?.ok && remote?.pending) {
    return { status: 'pending' as const, delivered: Boolean(remote.delivered), devCode: remote.devCode }
  }
  throw new Error(failMessage(remote?.error, res ? 'save_fail' : 'offline'))
}

const CONFIRMED_KEY = 'aure-waitlist-confirmed'
const CONFIRMED_CHANNEL = 'aure-waitlist'

export function announceConfirmed(email: string) {
  const normalized = email.trim().toLowerCase()
  try {
    localStorage.setItem(CONFIRMED_KEY, JSON.stringify({ email: normalized, at: Date.now() }))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('aure-waitlist'))
  try {
    const channel = new BroadcastChannel(CONFIRMED_CHANNEL)
    channel.postMessage({ type: 'confirmed', email: normalized })
    channel.close()
  } catch {
    /* ignore */
  }
}

export function onWaitlistConfirmed(email: string, callback: () => void) {
  const wanted = email.trim().toLowerCase()
  function matches(value: string) {
    return value.trim().toLowerCase() === wanted
  }
  function onStorage(event: StorageEvent) {
    if (event.key !== CONFIRMED_KEY || !event.newValue) return
    try {
      const payload = JSON.parse(event.newValue) as { email?: string }
      if (payload.email && matches(payload.email)) callback()
    } catch {
      /* ignore */
    }
  }
  let channel: BroadcastChannel | null = null
  try {
    channel = new BroadcastChannel(CONFIRMED_CHANNEL)
    channel.onmessage = (event: MessageEvent<{ type?: string; email?: string }>) => {
      if (event.data?.type === 'confirmed' && event.data.email && matches(event.data.email)) callback()
    }
  } catch {
    channel = null
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
    channel?.close()
  }
}

export async function fetchConfirmStatus(email: string) {
  const res = await apiFetch('/api/confirm-status', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
  const remote = await readApiJson<{ confirmed?: boolean }>(res)
  return Boolean(res?.ok && remote?.confirmed)
}

export async function confirmWaitlist(input: { token?: string; email?: string; code?: string }) {
  const res = await apiFetch('/api/confirm', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const remote = await readApiJson<{ confirmed?: boolean; email?: string; error?: string }>(res)
  if (res?.ok && remote?.confirmed) {
    if (remote.email) announceConfirmed(remote.email)
    else window.dispatchEvent(new Event('aure-waitlist'))
    return remote
  }
  throw new Error(failMessage(remote?.error, res ? 'confirm_fail' : 'offline'))
}

export async function fetchWaitlist(): Promise<{ entries: WaitlistEntry[]; remote: boolean }> {
  const res = await apiFetch('/api/waitlist')
  const remote = await readApiJson<{ entries: WaitlistEntry[] }>(res)
  if (res?.ok && remote?.entries) {
    return { entries: remote.entries.map(normalizeEntry), remote: true }
  }
  return { entries: loadWaitlist().map(normalizeEntry), remote: false }
}

export function countByIntent(entries: WaitlistEntry[]) {
  return {
    all: entries.length,
    account: entries.filter((e) => e.intent === 'account').length,
    standard: entries.filter((e) => e.intent === 'standard').length,
    plus: entries.filter((e) => e.intent === 'plus').length,
    premium: entries.filter((e) => e.intent === 'premium').length,
  }
}

export function countByCycle(entries: WaitlistEntry[]) {
  return {
    all: entries.length,
    none: entries.filter((e) => e.cycle === 'none').length,
    monthly: entries.filter((e) => e.cycle === 'monthly').length,
    yearly: entries.filter((e) => e.cycle === 'yearly').length,
  }
}

export function formatRequestTime(iso: string, locale: Locale = 'tr') {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'tr-TR', {
    timeZone: 'Europe/Istanbul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function xmlCell(value: string) {
  return `<Cell><Data ss:Type="String">${value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')}</Data></Cell>`
}

export function downloadWaitlistExcel(
  rows: WaitlistEntry[],
  filterLabel: string,
  copy: {
    date: string
    name: string
    email: string
    pkg: string
    cycle: string
    sheet: string
    packages: Record<SignupIntent, string>
    cycles: Record<BillingCycle, string>
    locale: Locale
  },
) {
  const header = [copy.date, copy.name, copy.email, copy.pkg, copy.cycle]
  const body = rows.map((row) => [
    formatRequestTime(row.createdAt, copy.locale),
    row.name,
    row.email,
    copy.packages[row.intent],
    copy.cycles[row.cycle] ?? row.cycle,
  ])
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${copy.sheet.replaceAll('"', '')}">
  <Table>
   <Row>${header.map(xmlCell).join('')}</Row>
   ${body.map((line) => `<Row>${line.map(xmlCell).join('')}</Row>`).join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  const stamp = new Date().toISOString().slice(0, 10)
  const safeFilter = filterLabel.toLowerCase().replaceAll(' ', '-')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `aure-talepler-${safeFilter}-${stamp}.xls`
  link.click()
  URL.revokeObjectURL(link.href)
}
