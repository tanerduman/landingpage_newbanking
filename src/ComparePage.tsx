import { useMemo, useState } from 'react'
import { withBase } from './base.ts'
import { comparisonRows, planColumns, type FeatureValue, type PlanColumnId } from './plans.ts'

function Cell({ value }: { value: FeatureValue }) {
  if (value === true) return <span className="yes">Var</span>
  if (value === false) return <span className="no">—</span>
  return <span>{value}</span>
}

function sameValues(values: FeatureValue[]) {
  return values.every((v) => v === values[0])
}

export default function ComparePage() {
  const [visible, setVisible] = useState<PlanColumnId[]>(['account', 'standard', 'plus', 'premium'])
  const [diffsOnly, setDiffsOnly] = useState(false)

  const columns = useMemo(() => planColumns.filter((c) => visible.includes(c.id)), [visible])

  const rows = useMemo(() => {
    const filtered = comparisonRows.map((row) => ({
      ...row,
      shown: columns.map((c) => row.values[c.id]),
    }))
    if (!diffsOnly) return filtered
    return filtered.filter((row) => !sameValues(row.shown))
  }, [columns, diffsOnly])

  function toggle(id: PlanColumnId) {
    setVisible((current) => {
      if (current.includes(id)) {
        if (current.length <= 2) return current
        return current.filter((item) => item !== id)
      }
      return [...planColumns.map((c) => c.id).filter((item) => item === id || current.includes(item))]
    })
  }

  return (
    <div className="page waitlist-page">
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="logo" href={withBase()} onClick={() => { window.location.hash = '' }}>
            <span className="logo-mark">A</span>
            AURE
          </a>
          <div className="waitlist-nav-actions">
            <a className="btn btn-ghost" href={withBase()} onClick={() => { window.location.hash = '' }}>
              Siteye dön
            </a>
          </div>
        </div>
      </header>

      <main className="wrap waitlist-main">
        <div className="section-head">
          <div>
            <div className="eyebrow">
              <span className="dot" /> Compare plans
            </div>
            <h1>Paketleri karşılaştır.</h1>
            <p className="lead">
              Özellikler iki blokta: Banka / Saving (ATM, döviz, hisse, mevduat, EFT) ve Kampanya (Migros, Koç Ailem,
              Divan, Setur).
            </p>
          </div>
        </div>

        <div className="compare-toolbar">
          <div className="compare-picks">
            {planColumns.map((col) => (
              <button
                key={col.id}
                type="button"
                className={`compare-pick ${visible.includes(col.id) ? 'active' : ''}`}
                onClick={() => toggle(col.id)}
              >
                {col.name}
              </button>
            ))}
          </div>
          <label className="compare-diffs">
            <input type="checkbox" checked={diffsOnly} onChange={(e) => setDiffsOnly(e.target.checked)} />
            Sadece farklar
          </label>
        </div>

        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Özellik</th>
                {columns.map((col) => (
                  <th key={col.id} className="center">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.label} className={sameValues(row.shown) ? 'compare-same' : 'compare-diff'}>
                  <td>
                    {index === 0 || rows[index - 1].group !== row.group ? (
                      <span className="compare-group">{row.group}</span>
                    ) : null}
                    {row.label}
                  </td>
                  {row.shown.map((value, i) => (
                    <td key={`${row.label}-${columns[i].id}`} className="center">
                      <Cell value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="waitlist-note">En az iki paket seçili kalır. Fiyatlar örnek niteliğindedir.</p>
      </main>
    </div>
  )
}
