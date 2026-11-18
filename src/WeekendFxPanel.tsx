import { useEffect, useState } from 'react'
import { useI18n } from './i18n/LocaleContext.tsx'
import { formatRequestTime } from './waitlist.ts'
import { fetchWeekendStats, type WeekendAnswer, type WeekendStats } from './weekendFx.ts'

const slices: { id: WeekendAnswer; color: string }[] = [
  { id: 'yes', color: '#d8ff4a' },
  { id: 'no', color: '#ffb4a8' },
]

export default function WeekendFxPanel() {
  const { t, locale } = useI18n()
  const [stats, setStats] = useState<WeekendStats | null>(null)
  const labels: Record<WeekendAnswer, string> = {
    yes: t.waitlist.weekendYes,
    no: t.waitlist.weekendNo,
  }

  useEffect(() => {
    let live = true
    async function load() {
      const next = await fetchWeekendStats()
      if (live && next) setStats(next)
    }
    void load()
    const timer = window.setInterval(() => void load(), 15_000)
    return () => {
      live = false
      window.clearInterval(timer)
    }
  }, [])

  const yes = stats?.yes ?? 0
  const no = stats?.no ?? 0
  const total = yes + no
  const counts: Record<WeekendAnswer, number> = { yes, no }
  const r = 62
  const c = 2 * Math.PI * r
  const dashes = slices.map((slice) => (total === 0 ? 0 : (counts[slice.id] / total) * c))
  const arcs = slices.map((slice, index) => ({
    ...slice,
    value: counts[slice.id],
    dash: dashes[index],
    offset: dashes.slice(0, index).reduce((sum, value) => sum + value, 0),
  }))

  return (
    <>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span className="dot" /> {t.waitlist.tabWeekend}
          </div>
          <h1>{t.waitlist.weekendTitle}</h1>
          <p className="lead">{t.waitlist.weekendLead}</p>
        </div>
      </div>
      <section className="waitlist-pie-card" aria-label={t.waitlist.weekendTitle}>
        <div className="waitlist-pie-body">
          <div className="waitlist-pie-chart">
            <svg viewBox="0 0 180 180" role="img" aria-label={t.waitlist.weekendChart}>
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
              <strong>{total}</strong>
              <span>{t.waitlist.weekendTotal}</span>
            </div>
          </div>
          <ul className="waitlist-pie-legend">
            {arcs.map((slice) => {
              const pct = total === 0 ? 0 : Math.round((slice.value / total) * 100)
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
            {!stats || stats.recent.length === 0 ? (
              <tr>
                <td colSpan={2} className="waitlist-empty">
                  {t.waitlist.weekendEmpty}
                </td>
              </tr>
            ) : (
              stats.recent.map((row) => (
                <tr key={row.id}>
                  <td>{formatRequestTime(row.createdAt, locale)}</td>
                  <td>
                    <span className={`pkg-pill weekend-${row.answer}`}>{labels[row.answer]}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
