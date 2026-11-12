import { apiFetch, readApiJson } from './api.ts'
import { messages, readLocale, type Locale } from './i18n/index.ts'

export type SectorOption = {
  id: string
  labelTr: string
  labelEn: string
  position: number
}

export type InterestEntry = {
  id: string
  name: string
  email: string
  intent: 'account' | 'standard' | 'plus' | 'premium'
  sectors: string[]
  updatedAt: string
}

function cleanSectors(value: unknown) {
  if (!Array.isArray(value)) return []
  const sectors: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!id || id.length > 40 || sectors.includes(id)) continue
    sectors.push(id)
  }
  return sectors
}

function normalize(row: InterestEntry): InterestEntry | null {
  const intent = row.intent
  if (intent !== 'account' && intent !== 'standard' && intent !== 'plus' && intent !== 'premium') return null
  const sectors = cleanSectors(row.sectors)
  if (!sectors.length) return null
  return { ...row, intent, sectors }
}

function fail(remoteError: string | undefined) {
  const t = messages(readLocale())
  return remoteError || t.errors.interest_fail || t.signup.saveFail
}

export function sectorLabel(sector: SectorOption, locale: Locale) {
  return locale === 'en' ? sector.labelEn : sector.labelTr
}

export async function fetchSectors(): Promise<SectorOption[]> {
  const res = await apiFetch('/api/interest?catalog=1')
  const remote = await readApiJson<{ sectors?: SectorOption[] }>(res)
  if (!res?.ok || !remote?.sectors) return []
  return remote.sectors.filter((sector) => sector && typeof sector.id === 'string' && sector.labelTr && sector.labelEn)
}

export async function createSector(labelTr: string, labelEn: string) {
  const res = await apiFetch('/api/interest', {
    method: 'POST',
    body: JSON.stringify({ labelTr, labelEn, lang: readLocale() }),
  })
  const remote = await readApiJson<{ sector?: SectorOption; error?: string }>(res)
  if (res?.ok && remote?.sector) return remote.sector
  throw new Error(fail(remote?.error))
}

export async function updateSector(id: string, labelTr: string, labelEn: string) {
  const res = await apiFetch('/api/interest', {
    method: 'PATCH',
    body: JSON.stringify({ id, labelTr, labelEn, lang: readLocale() }),
  })
  const remote = await readApiJson<{ sector?: SectorOption; error?: string }>(res)
  if (res?.ok && remote?.sector) return remote.sector
  throw new Error(fail(remote?.error))
}

export async function deleteSector(id: string) {
  const res = await apiFetch('/api/interest', {
    method: 'DELETE',
    body: JSON.stringify({ id, lang: readLocale() }),
  })
  const remote = await readApiJson<{ ok?: boolean; error?: string }>(res)
  if (res?.ok && remote?.ok) return
  throw new Error(fail(remote?.error))
}

export async function saveInterest(email: string, sectors: string[]) {
  const res = await apiFetch('/api/interest', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), sectors, lang: readLocale() }),
  })
  const remote = await readApiJson<{ ok?: boolean; error?: string }>(res)
  if (res?.ok && remote?.ok) return
  throw new Error(fail(remote?.error))
}

export async function fetchInterests(): Promise<{ entries: InterestEntry[]; authorized: boolean }> {
  const res = await apiFetch('/api/interest')
  if (res?.status === 401 || !res?.ok) return { entries: [], authorized: false }
  const remote = await readApiJson<{ entries?: InterestEntry[] }>(res)
  if (!remote?.entries) return { entries: [], authorized: false }
  return {
    entries: remote.entries.flatMap((row) => {
      const next = normalize(row)
      return next ? [next] : []
    }),
    authorized: true,
  }
}
