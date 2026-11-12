import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createSector,
  deleteSector,
  fetchSectors,
  sectorLabel,
  updateSector,
  type InterestEntry,
  type SectorOption,
} from './interest.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import type { SignupIntent } from './waitlist.ts'

type Filter = 'all' | SignupIntent

export default function InterestPanel({ entries }: { entries: InterestEntry[] }) {
  const { t, locale } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')
  const [sectors, setSectors] = useState<SectorOption[]>([])
  const [labelTr, setLabelTr] = useState('')
  const [labelEn, setLabelEn] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editTr, setEditTr] = useState('')
  const [editEn, setEditEn] = useState('')
  const [armed, setArmed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: t.pkg.all },
    { id: 'account', label: t.plans.basicName },
    { id: 'standard', label: t.pkg.standard },
    { id: 'plus', label: t.pkg.plus },
    { id: 'premium', label: t.pkg.premium },
  ]
  const visible = useMemo(
    () => entries.filter((row) => filter === 'all' || row.intent === filter),
    [entries, filter],
  )

  useEffect(() => {
    let cancelled = false
    void fetchSectors().then((next) => {
      if (!cancelled) setSectors(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const next: Record<string, number> = {}
    for (const sector of sectors) next[sector.id] = 0
    for (const row of visible) {
      for (const sector of row.sectors) next[sector] = (next[sector] ?? 0) + 1
    }
    return next
  }, [sectors, visible])
  const order = sectors.map((sector) => sector.id)
  const extras = Object.keys(counts).filter((id) => !order.includes(id))
  const ranked = [...order, ...extras].sort((a, b) => {
    const delta = (counts[b] ?? 0) - (counts[a] ?? 0)
    if (delta !== 0) return delta
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    return (ai === -1 ? 1000 : ai) - (bi === -1 ? 1000 : bi)
  })
  const max = Math.max(1, ...ranked.map((id) => counts[id] ?? 0))
  const planName = (intent: SignupIntent) =>
    intent === 'account'
      ? t.plans.basicName
      : intent === 'standard'
        ? t.pkg.standard
        : intent === 'plus'
          ? t.pkg.plus
          : t.pkg.premium
  const nameOf = (id: string) => {
    const sector = sectors.find((item) => item.id === id)
    return sector ? sectorLabel(sector, locale) : id
  }

  async function addArea(e: FormEvent) {
    e.preventDefault()
    if (labelTr.trim().length < 2 || labelEn.trim().length < 2) {
      setFormError(t.errors.sector)
      return
    }
    setBusy(true)
    setFormError('')
    try {
      const created = await createSector(labelTr.trim(), labelEn.trim())
      setSectors((current) => [...current, created].sort((a, b) => a.position - b.position))
      setLabelTr('')
      setLabelEn('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t.errors.interest_fail)
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(id: string) {
    if (editTr.trim().length < 2 || editEn.trim().length < 2) {
      setFormError(t.errors.sector)
      return
    }
    setBusy(true)
    setFormError('')
    try {
      const saved = await updateSector(id, editTr.trim(), editEn.trim())
      setSectors((current) => current.map((sector) => (sector.id === id ? saved : sector)))
      setEditing(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t.errors.interest_fail)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (armed !== id) {
      setArmed(id)
      return
    }
    setBusy(true)
    setFormError('')
    try {
      await deleteSector(id)
      setSectors((current) => current.filter((sector) => sector.id !== id))
      setArmed(null)
      if (editing === id) setEditing(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t.errors.interest_fail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span className="dot" /> {t.waitlist.tabInterests}
          </div>
          <h1>{t.waitlist.interestTitle}</h1>
          <p className="lead">{t.waitlist.interestLead}</p>
        </div>
      </div>
      <section className="sector-board">
        <h2>{t.waitlist.sectorTitle}</h2>
        <p>{t.waitlist.sectorLead}</p>
        <form className="sector-form" onSubmit={(e) => void addArea(e)}>
          <label>
            {t.waitlist.sectorTr}
            <input value={labelTr} maxLength={40} onChange={(e) => setLabelTr(e.target.value)} />
          </label>
          <label>
            {t.waitlist.sectorEn}
            <input value={labelEn} maxLength={40} onChange={(e) => setLabelEn(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-solid" disabled={busy}>
            {t.waitlist.sectorAdd}
          </button>
        </form>
        {formError ? <p className="waitlist-action-error">{formError}</p> : null}
        <ul className="sector-list">
          {sectors.map((sector) => (
            <li key={sector.id} className="sector-row">
              {editing === sector.id ? (
                <div className="sector-edit">
                  <input value={editTr} maxLength={40} aria-label={t.waitlist.sectorTr} onChange={(e) => setEditTr(e.target.value)} />
                  <input value={editEn} maxLength={40} aria-label={t.waitlist.sectorEn} onChange={(e) => setEditEn(e.target.value)} />
                </div>
              ) : (
                <span>
                  <strong>{sector.labelTr}</strong>
                  <em>{sector.labelEn}</em>
                </span>
              )}
              <div className="sector-actions">
                {editing === sector.id ? (
                  <>
                    <button type="button" className="btn btn-solid" disabled={busy} onClick={() => void saveEdit(sector.id)}>
                      {t.waitlist.sectorSave}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                      {t.waitlist.sectorCancel}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setEditing(sector.id)
                      setEditTr(sector.labelTr)
                      setEditEn(sector.labelEn)
                      setArmed(null)
                    }}
                  >
                    {t.waitlist.sectorEdit}
                  </button>
                )}
                <button
                  type="button"
                  className={`row-delete${armed === sector.id ? ' armed' : ''}`}
                  disabled={busy}
                  onClick={() => void remove(sector.id)}
                >
                  {armed === sector.id ? t.waitlist.deleteConfirm : t.waitlist.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="waitlist-stats">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`waitlist-stat ${filter === item.id ? 'active' : ''}`}
            onClick={() => setFilter(item.id)}
          >
            <strong>{item.id === 'all' ? entries.length : entries.filter((row) => row.intent === item.id).length}</strong>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="interest-bars" aria-label={t.waitlist.interestSectors}>
        {ranked.map((id) => (
          <div className="interest-bar-row" key={id}>
            <span>{nameOf(id)}</span>
            <div className="interest-track">
              <div className="interest-fill" style={{ width: `${((counts[id] ?? 0) / max) * 100}%` }} />
            </div>
            <strong>{counts[id] ?? 0}</strong>
          </div>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="waitlist-note">{t.waitlist.interestEmpty}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.waitlist.interestPerson}</th>
                <th>{t.waitlist.interestPackage}</th>
                <th>{t.waitlist.interestSectors}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    <div className="interest-mail">{row.email}</div>
                  </td>
                  <td>{planName(row.intent)}</td>
                  <td>{row.sectors.map((id) => nameOf(id)).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
