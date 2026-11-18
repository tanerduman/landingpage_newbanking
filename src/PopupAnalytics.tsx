import { useEffect, useState } from 'react'
import { useI18n } from './i18n/LocaleContext.tsx'
import { messages, readLocale } from './i18n/index.ts'
import { fetchPopupAdmin, type PopupStat, type SitePopup } from './popupCopy.ts'
import { formatRequestTime } from './waitlist.ts'

const slices = [
  { id: 'yes' as const, color: '#d8ff4a' },
  { id: 'no' as const, color: '#ffb4a8' },
  { id: 'closed' as const, color: '#6f6a60' },
]

export default function PopupAnalytics() {
  const { t, locale } = useI18n()
  const [popups, setPopups] = useState<SitePopup[] | null>(null)
  const [stats, setStats] = useState<PopupStat[]>([])
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    async function load() {
      const admin = await fetchPopupAdmin()
      if (!live) return
      if (!admin) {
        setError(messages(readLocale()).errors.offline)
        return
      }
      setError('')
      setPopups(admin.popups)
      setStats(admin.stats)
      setSelected((current) => (admin.popups.some((popup) => popup.id === current) ? current : admin.popups[0]?.id || ''))
    }
    void load()
    const timer = window.setInterval(() => void load(), 15_000)
    return () => {
      live = false
      window.clearInterval(timer)
    }
  }, [])

  const popup = popups?.find((item) => item.id === selected) ?? null
  const stat = stats.find((item) => item.id === popup?.id)
  const yes = stat?.yes ?? 0
  const no = stat?.no ?? 0
  const shown = stat?.shown ?? 0
  const closed = Math.max(0, shown - yes - no)
  const counts = { yes, no, closed }
  const r = 62
  const c = 2 * Math.PI * r
  const dashes = slices.map((slice) => (shown === 0 ? 0 : (counts[slice.id] / shown) * c))
  const arcs = slices.map((slice, index) => ({
    ...slice,
    value: counts[slice.id],
    dash: dashes[index],
    offset: dashes.slice(0, index).reduce((sum, value) => sum + value, 0),
  }))
  const labels = {
    yes: popup ? popup.yes[locale] : t.waitlist.popupYesCount,
    no: popup ? popup.no[locale] : t.waitlist.popupNoCount,
    closed: t.waitlist.popupClosed,
  }

  return (
    <>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span className="dot" /> {t.waitlist.popupTabStats}
          </div>
          <h1>{t.waitlist.popupStatsTitle}</h1>
          <p className="lead">{t.waitlist.popupStatsLead}</p>
        </div>
      </div>
      {error ? <p className="waitlist-action-error">{error}</p> : null}
      {popups && popups.length === 0 ? <p className="waitlist-empty">{t.waitlist.popupEmpty}</p> : null}
      {popups && popups.length > 0 ? (
        <div className="popup-picks" role="tablist" aria-label={t.waitlist.popupPick}>
          {popups.map((item, index) => {
            const count = stats.find((row) => row.id === item.id)?.shown ?? 0
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === selected}
                className={item.id === selected ? 'active' : ''}
                onClick={() => setSelected(item.id)}
              >
                <span>
                  {index + 1}. {item.question[locale]}
                </span>
                <b>{count}</b>
              </button>
            )
          })}
        </div>
      ) : null}
      {popup ? (
        <>
          <p className="popup-analysis-title">
            {popup.question[locale]}
            {popup.active ? null : <em>{t.waitlist.popupOffline}</em>}
          </p>
          <section className="waitlist-pie-card" aria-label={popup.question[locale]}>
            <div className="waitlist-pie-body">
              <div className="waitlist-pie-chart">
                <svg viewBox="0 0 180 180" role="img" aria-label={t.waitlist.popupStatsChart}>
                  <circle cx="90" cy="90" r={r} fill="none" stroke="#1c1c20" strokeWidth="28" />
                  {arcs
                    .filter((slice) => slice.dash > 0)
                    .map((slice) => (
                      <circle
                        key={slice.id}
                        cx="90"
                        cy="90"
                        r={r}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="28"
                        strokeDasharray={`${slice.dash} ${c - slice.dash}`}
                        strokeDashoffset={-slice.offset}
                        transform="rotate(-90 90 90)"
                        strokeLinecap="butt"
                      />
                    ))}
                </svg>
                <div className="waitlist-pie-center">
                  <strong>{shown}</strong>
                  <span>{t.waitlist.popupShown}</span>
                </div>
              </div>
              <ul className="waitlist-pie-legend">
                {arcs.map((slice) => {
                  const pct = shown === 0 ? 0 : Math.round((slice.value / shown) * 100)
                  return (
                    <li key={slice.id}>
                      <span className="weekend-legend">
                        <i style={{ background: slice.color }} />
                        <span>{labels[slice.id]}</span>
                        <b>
                          {slice.value} · %{pct}
                        </b>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.waitlist.date}</th>
                  <th>{t.waitlist.weekendAnswer}</th>
                </tr>
              </thead>
              <tbody>
                {!stat || stat.recent.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="waitlist-empty">
                      {t.waitlist.popupStatsEmpty}
                    </td>
                  </tr>
                ) : (
                  stat.recent.map((row) => (
                    <tr key={`${row.ref}-${row.at}`}>
                      <td>{formatRequestTime(row.at, locale)}</td>
                      <td>
                        <span className={`pkg-pill weekend-${row.answer ?? 'closed'}`}>
                          {row.answer ? labels[row.answer] : t.waitlist.popupClosed}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  )
}
