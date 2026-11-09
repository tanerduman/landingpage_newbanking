import { useI18n } from './i18n/LocaleContext.tsx'
import { type SupportKind } from './support.ts'

const SLICES: { id: SupportKind; color: string }[] = [
  { id: 'complaint', color: '#ffb4a8' },
  { id: 'suggestion', color: '#d8ff4a' },
  { id: 'support', color: '#c9d7ff' },
]

export default function SupportPie({
  counts,
  total,
  active,
  onSelect,
}: {
  counts: Record<SupportKind, number>
  total: number
  active: 'all' | SupportKind
  onSelect: (id: SupportKind) => void
}) {
  const { t } = useI18n()
  const r = 62
  const c = 2 * Math.PI * r
  const dashes = SLICES.map((slice) => (total === 0 ? 0 : (counts[slice.id] / total) * c))
  const arcs = SLICES.map((slice, index) => ({
    ...slice,
    value: counts[slice.id],
    dash: dashes[index],
    offset: dashes.slice(0, index).reduce((sum, value) => sum + value, 0),
  }))

  return (
    <section className="waitlist-pie-card" aria-label={t.waitlist.pieKindTitle}>
      <div>
        <p className="waitlist-pie-kicker">{t.waitlist.pieKind}</p>
        <h2>{t.waitlist.pieKindTitle}</h2>
      </div>
      <div className="waitlist-pie-body">
        <div className="waitlist-pie-chart">
          <svg viewBox="0 0 180 180" role="img" aria-label={t.waitlist.pieKindChart}>
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
            <strong>{total === 0 ? '—' : '%100'}</strong>
            <span>
              {total} {t.waitlist.pieRequests}
            </span>
          </div>
        </div>
        <ul className="waitlist-pie-legend">
          {arcs.map((slice) => {
            const pct = total === 0 ? 0 : Math.round((slice.value / total) * 100)
            return (
              <li key={slice.id}>
                <button
                  type="button"
                  className={active === slice.id ? 'active' : ''}
                  onClick={() => onSelect(slice.id)}
                >
                  <i style={{ background: slice.color }} />
                  <span>{t.support.kinds[slice.id]}</span>
                  <b>
                    {slice.value} · %{pct}
                  </b>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
