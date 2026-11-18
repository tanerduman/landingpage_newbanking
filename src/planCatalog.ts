import { apiFetch, readApiJson } from './api.ts'
import { PLAN_IDS, type PlanCatalog, type PlanColumn, type PlanContentRow, type PlanGroup } from './planCatalogData.ts'

export type { PlanCatalog, PlanColumn, PlanContentRow, PlanGroup }
export { PLAN_IDS }

function isText(value: unknown): value is { tr: string; en: string } {
  if (!value || typeof value !== 'object') return false
  const row = value as { tr?: unknown; en?: unknown }
  return typeof row.tr === 'string' && typeof row.en === 'string' && row.tr.trim().length > 0 && row.en.trim().length > 0
}

function normalize(value: unknown): PlanCatalog | null {
  if (!value || typeof value !== 'object') return null
  const data = value as { showPrices?: unknown; prices?: unknown; rows?: unknown }
  const showPrices = data.showPrices === undefined ? true : data.showPrices
  if (typeof showPrices !== 'boolean') return null
  if (!data.prices || typeof data.prices !== 'object' || !Array.isArray(data.rows)) return null
  const prices = data.prices as Record<string, unknown>
  for (const id of PLAN_IDS) {
    if (!isText(prices[id])) return null
  }
  const rows: PlanContentRow[] = []
  for (const item of data.rows) {
    if (!item || typeof item !== 'object') return null
    const row = item as PlanContentRow
    if (row.group !== 'bank' && row.group !== 'travel' && row.group !== 'brand') return null
    if (!row.id || !row.labelTr || !row.labelEn) return null
    for (const id of PLAN_IDS) {
      if (!isText(row.values?.[id])) return null
    }
    rows.push(row)
  }
  if (!rows.length) return null
  return { showPrices, prices: prices as PlanCatalog['prices'], rows }
}

export async function fetchPlanCatalog(): Promise<PlanCatalog | null> {
  const res = await apiFetch('/api/waitlist?plans=1')
  const remote = await readApiJson<{ plans?: PlanCatalog }>(res)
  if (!res?.ok) return null
  return normalize(remote?.plans)
}

export async function savePlanCatalog(catalog: PlanCatalog): Promise<PlanCatalog> {
  const res = await apiFetch('/api/waitlist', {
    method: 'PATCH',
    body: JSON.stringify({ planCatalog: true, ...catalog }),
  })
  const remote = await readApiJson<{ plans?: PlanCatalog; error?: string }>(res)
  const saved = normalize(remote?.plans)
  if (!res?.ok || !saved) throw new Error(remote?.error || 'invalid')
  return saved
}
