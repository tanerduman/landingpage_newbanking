import { withBase } from './base.ts'
import { comparisonRows, planColumns, type FeatureValue } from './plans.ts'

const ICONS: Record<string, string> = {
  atm: '₺',
  fx: '€',
  stock: '↑',
  save: '%',
  send: '→',
  card: '◇',
  plane: '✈',
  shop: '▣',
  bag: '▢',
  cake: '✦',
}

function Cell({ value }: { value: FeatureValue }) {
  if (value === true) return <span className="rev-check">✓</span>
  if (value === false) return <span className="rev-dash">—</span>
  return <span className="rev-value">{value}</span>
}

export default function ComparePage() {
  const groups = [...new Set(comparisonRows.map((row) => row.group))]

  return (
    <div className="page compare-shell">
      <header className="nav compare-nav">
        <div className="wrap nav-inner">
          <a
            className="logo"
            href={withBase()}
            onClick={() => {
              window.location.hash = ''
            }}
          >
            <span className="logo-mark">A</span>
            AURE
          </a>
          <a
            className="btn btn-ghost"
            href={withBase()}
            onClick={() => {
              window.location.hash = ''
            }}
          >
            Siteye dön
          </a>
        </div>
      </header>

      <main className="wrap compare-main">
        <p className="compare-kicker">Compare plans</p>
        <h1>Paketleri yan yana gör.</h1>
        <p className="compare-lead">Saving, seyahat ve marka işbirlikleri. Her hücre net: var, yok veya tutar.</p>

        <div className="rev-board">
          <div className="rev-head">
            <div className="rev-corner" />
            {planColumns.map((col) => (
              <div key={col.id} className="rev-plan">
                <h2>{col.name}</h2>
                <p>{col.price}</p>
                <a className="rev-get" href={`${withBase()}#plans`}>
                  Seç
                </a>
              </div>
            ))}
          </div>

          {groups.map((group) => (
            <div key={group}>
              <div className="rev-section">
                <span>{group}</span>
              </div>
              {comparisonRows
                .filter((row) => row.group === group)
                .map((row) => (
                  <div key={row.label} className="rev-row">
                    <div className="rev-feat">
                      <span className="rev-ico">{ICONS[row.icon] ?? '•'}</span>
                      <span>{row.label}</span>
                    </div>
                    {planColumns.map((col) => (
                      <div key={col.id} className="rev-cell">
                        <Cell value={row.values[col.id]} />
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
