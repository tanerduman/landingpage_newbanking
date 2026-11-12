import { useMemo, useState } from 'react'
import { INTEREST_SECTORS, type InterestEntry, type InterestSector } from './interest.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import type { SignupIntent } from './waitlist.ts'

type Filter = 'all' | SignupIntent

export default function InterestPanel({ entries }: { entries: InterestEntry[] }) {
  const { t } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')
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
  const counts = useMemo(() => {
    const next = Object.fromEntries(INTEREST_SECTORS.map((id) => [id, 0])) as Record<InterestSector, number>
    for (const row of visible) {
      for (const sector of row.sectors) next[sector] += 1
    }
    return next
  }, [visible])
  const max = Math.max(1, ...INTEREST_SECTORS.map((id) => counts[id]))
  const ranked = [...INTEREST_SECTORS].sort(
    (a, b) => counts[b] - counts[a] || INTEREST_SECTORS.indexOf(a) - INTEREST_SECTORS.indexOf(b),
  )
  const planName = (intent: SignupIntent) =>
    intent === 'account'
      ? t.plans.basicName
      : intent === 'standard'
        ? t.pkg.standard
        : intent === 'plus'
          ? t.pkg.plus
          : t.pkg.premium

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
            <span>{t.signup.sectors[id]}</span>
            <div className="interest-track">
              <div className="interest-fill" style={{ width: `${(counts[id] / max) * 100}%` }} />
            </div>
            <strong>{counts[id]}</strong>
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
                  <td>{row.sectors.map((id) => t.signup.sectors[id]).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
