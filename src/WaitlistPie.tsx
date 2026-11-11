import { useI18n } from './i18n/LocaleContext.tsx'
import { type SignupIntent } from './waitlist'

const SLICES: { id: SignupIntent; color: string }[] = [
  { id: 'account', color: '#d8ff4a' },
  { id: 'standard', color: '#8b90a8' },
  { id: 'plus', color: '#7c6cf5' },
  { id: 'premium', color: '#c8a46b' },
]

type Counts = Record<SignupIntent, number>

export default function WaitlistPie({
  kicker,
  title,
  counts,
  total,
  active,
  onSelect,
  hideAccount = false,
}: {
  kicker: string
  title: string
  counts: Counts
  total: number
  active: 'all' | SignupIntent
  onSelect: (id: SignupIntent) => void
  hideAccount?: boolean
}) {
  const { t } = useI18n()
  const labels: Record<SignupIntent, string> = {
    account: t.pkg.account,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }
  const slices = hideAccount ? SLICES.filter((slice) => slice.id !== 'account') : SLICES
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
    <section className="waitlist-pie-card" aria-label={title}>
      <div>
        <p className="waitlist-pie-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      <div className="waitlist-pie-body">
        <div className="waitlist-pie-chart">
          <svg viewBox="0 0 180 180" role="img" aria-label={t.waitlist.pieChart}>
            <circle cx="90" cy="90" r={r} fill="none" stroke="var(--track)" strokeWidth="28" />
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
                  <span>{labels[slice.id]}</span>
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
