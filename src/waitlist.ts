import { apiFetch, readApiJson } from './api.ts'

export type PlanId = 'standard' | 'plus' | 'premium'
export type SignupIntent = 'account' | PlanId

export type WaitlistEntry = {
  id: string
  name: string
  email: string
  intent: SignupIntent
  createdAt: string
}

export const PACKAGE_LABELS: Record<SignupIntent, string> = {
  account: 'Paketsiz hesap',
  standard: 'Standard',
  plus: 'Plus',
  premium: 'Premium',
}

export const PACKAGE_FILTERS: { id: 'all' | SignupIntent; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'account', label: 'Paketsiz hesap' },
  { id: 'standard', label: 'Standard' },
  { id: 'plus', label: 'Plus' },
  { id: 'premium', label: 'Premium' },
]

const KEY = 'aure-waitlist'

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

export async function fetchCaptcha() {
  const res = await apiFetch('/api/captcha')
  const data = await readApiJson<{ token: string; question: string; error?: string }>(res)
  if (!res?.ok || !data?.token || !data.question) {
    throw new Error(data?.error || 'Güvenlik sorusu yüklenemedi.')
  }
  return { token: data.token, question: data.question }
}

export async function addWaitlistEntry(input: {
  name: string
  email: string
  intent: SignupIntent
  captchaToken: string
  captchaAnswer: string
}) {
  const payload = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    intent: input.intent,
    captchaToken: input.captchaToken,
    captchaAnswer: input.captchaAnswer.trim(),
  }
  const res = await apiFetch('/api/waitlist', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const remote = await readApiJson<{ entry: WaitlistEntry; error?: string }>(res)
  if (res?.ok && remote?.entry) {
    window.dispatchEvent(new Event('aure-waitlist'))
    return remote.entry
  }
  throw new Error(remote?.error || (res ? 'Kayıt alınamadı.' : 'Sunucuya bağlanılamadı.'))
}

export async function fetchWaitlist(): Promise<{ entries: WaitlistEntry[]; remote: boolean }> {
  const res = await apiFetch('/api/waitlist')
  const remote = await readApiJson<{ entries: WaitlistEntry[] }>(res)
  if (res?.ok && remote?.entries) return { entries: remote.entries, remote: true }
  return { entries: loadWaitlist(), remote: false }
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

export function formatRequestTime(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
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

export function downloadWaitlistExcel(rows: WaitlistEntry[], filterLabel: string) {
  const header = ['Tarih', 'Ad soyad', 'E-posta', 'Paket']
  const body = rows.map((row) => [
    formatRequestTime(row.createdAt),
    row.name,
    row.email,
    PACKAGE_LABELS[row.intent],
  ])
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Talepler">
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
