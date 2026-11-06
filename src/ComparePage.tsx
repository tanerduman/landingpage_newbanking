import { useState } from 'react'
import { withBase } from './base.ts'
import LangSwitch from './LangSwitch.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { localizeFeature } from './i18n/format.ts'
import { comparisonRows, planColumns, type FeatureValue, type PlanColumnId } from './plans.ts'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import type { SignupIntent } from './waitlist'

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
  const { t, locale } = useI18n()
  const groups = [...new Set(comparisonRows.map((row) => row.group))]
  const [intent, setIntent] = useState<SignupIntent | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const groupLabel = {
    bank: t.compare.groupBank,
    travel: t.compare.groupTravel,
    brand: t.compare.groupBrand,
  }
  const colName: Record<PlanColumnId, string> = {
    account: t.pkg.account,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }
  const colPrice: Record<PlanColumnId, string> = {
    account: t.pkg.free,
    standard: `299 ${t.pkg.priceMonth}`,
    plus: `399 ${t.pkg.priceMonth}`,
    premium: `499 ${t.pkg.priceMonth}`,
  }

  return (
    <div className="page compare-shell">
      <header className="nav compare-nav">
        <div className="wrap nav-inner">
          <a className="logo" href={withBase()}>
            <span className="logo-mark">A</span>
            AURE
          </a>
          <div className="waitlist-nav-actions">
            <LangSwitch />
            <a className="btn btn-ghost" href={withBase('campaigns')}>
              {t.nav.campaigns}
            </a>
            <a className="btn btn-ghost" href={withBase()}>
              {t.nav.back}
            </a>
          </div>
        </div>
      </header>

      <main className="wrap compare-main">
        <p className="compare-kicker">{t.compare.kicker}</p>
        <h1>{t.compare.title}</h1>
        <p className="compare-lead">{t.compare.lead}</p>

        <div className="rev-board">
          <div className="rev-head">
            <div className="rev-corner" />
            {planColumns.map((col) => (
              <div key={col.id} className="rev-plan">
                <h2>{colName[col.id]}</h2>
                <p>{colPrice[col.id]}</p>
                <button type="button" className="rev-get" onClick={() => setIntent(col.id)}>
                  {t.compare.choose}
                </button>
              </div>
            ))}
          </div>

          {groups.map((group) => (
            <div key={group}>
              <div className="rev-section">
                <span>{groupLabel[group]}</span>
              </div>
              {comparisonRows
                .filter((row) => row.group === group)
                .map((row) => (
                  <div key={row.id} className="rev-row">
                    <div className="rev-feat">
                      <span className="rev-ico">{ICONS[row.icon] ?? '•'}</span>
                      <span>{t.compare.rows[row.id]}</span>
                    </div>
                    {planColumns.map((col) => (
                      <div key={col.id} className="rev-cell">
                        <Cell value={localizeFeature(row.values[col.id], t, locale)} />
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </main>

      {intent && (
        <SignupModal
          intent={intent}
          onClose={(msg) => {
            setIntent(null)
            if (msg) setToast(msg)
          }}
        />
      )}
      {toast && <SignupToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
