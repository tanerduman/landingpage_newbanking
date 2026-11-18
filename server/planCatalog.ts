import { PLAN_IDS, type PlanCatalog, type PlanColumn, type PlanContentRow, type PlanGroup, type PlanText } from '../src/planCatalogData.ts'

const GROUPS = new Set<PlanGroup>(['bank', 'travel', 'brand'])
const ID_RE = /^[a-zA-Z0-9-]{1,40}$/

function text(value: unknown, max: number): PlanText | null {
  if (!value || typeof value !== 'object') return null
  const row = value as { tr?: unknown; en?: unknown }
  const tr = typeof row.tr === 'string' ? row.tr.trim() : ''
  const en = typeof row.en === 'string' ? row.en.trim() : ''
  if (!tr || !en || tr.length > max || en.length > max) return null
  return { tr, en }
}

function columns(value: unknown, max: number): Record<PlanColumn, PlanText> | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  const next = {} as Record<PlanColumn, PlanText>
  for (const id of PLAN_IDS) {
    const cell = text(source[id], max)
    if (!cell) return null
    next[id] = cell
  }
  return next
}

export function validatePlanCatalog(body: unknown): PlanCatalog | string {
  if (!body || typeof body !== 'object') return 'invalid'
  const data = body as { prices?: unknown; rows?: unknown }
  const prices = columns(data.prices, 24)
  if (!prices) return 'invalid'
  if (!Array.isArray(data.rows) || data.rows.length < 1 || data.rows.length > 40) return 'invalid'
  const rows: PlanContentRow[] = []
  const seen = new Set<string>()
  for (const item of data.rows) {
    if (!item || typeof item !== 'object') return 'invalid'
    const row = item as { id?: unknown; group?: unknown; labelTr?: unknown; labelEn?: unknown; values?: unknown }
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    if (!ID_RE.test(id) || seen.has(id)) return 'invalid'
    if (typeof row.group !== 'string' || !GROUPS.has(row.group as PlanGroup)) return 'invalid'
    const labelTr = typeof row.labelTr === 'string' ? row.labelTr.trim() : ''
    const labelEn = typeof row.labelEn === 'string' ? row.labelEn.trim() : ''
    if (labelTr.length < 1 || labelTr.length > 80 || labelEn.length < 1 || labelEn.length > 80) return 'invalid'
    const values = columns(row.values, 80)
    if (!values) return 'invalid'
    seen.add(id)
    rows.push({ id, group: row.group as PlanGroup, labelTr, labelEn, values })
  }
  return { prices, rows }
}
