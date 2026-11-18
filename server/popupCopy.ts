import { DEFAULT_POPUP_ID, POPUP_LIMIT, type PopupText, type SitePopup } from '../src/popupCopyData.ts'

function field(value: unknown, max: number, required: boolean) {
  if (typeof value !== 'string') return required ? null : ''
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length > max) return null
  if (required && !text) return null
  return text
}

function pair(value: unknown, max: number, required: boolean): PopupText | null {
  if (!value || typeof value !== 'object') return required ? null : { tr: '', en: '' }
  const row = value as { tr?: unknown; en?: unknown }
  const tr = field(row.tr, max, required)
  const en = field(row.en, max, required)
  if (tr === null || en === null) return null
  return { tr, en }
}

function popupId(value: unknown) {
  return typeof value === 'string' && (value === DEFAULT_POPUP_ID || /^p[0-9a-f]{8}$/.test(value))
}

export function validatePopupCatalog(body: unknown): SitePopup[] | string {
  const source = body && typeof body === 'object' && 'popups' in body ? (body as { popups?: unknown }).popups : body
  if (!Array.isArray(source)) return 'invalid'
  if (source.length > POPUP_LIMIT) return 'popup_limit'
  const popups: SitePopup[] = []
  const seen = new Set<string>()
  for (const item of source) {
    if (!item || typeof item !== 'object') return 'invalid'
    const row = item as {
      id?: unknown
      active?: unknown
      kicker?: unknown
      tag?: unknown
      question?: unknown
      yes?: unknown
      no?: unknown
    }
    if (!popupId(row.id) || seen.has(row.id) || typeof row.active !== 'boolean') return 'invalid'
    const kicker = pair(row.kicker, 32, false)
    const tag = pair(row.tag, 24, false)
    const question = pair(row.question, 280, true)
    const yes = pair(row.yes, 40, true)
    const no = pair(row.no, 32, true)
    if (!kicker || !tag || !question || !yes || !no) return 'invalid'
    seen.add(row.id)
    popups.push({ id: row.id, active: row.active, kicker, tag, question, yes, no })
  }
  return popups
}
