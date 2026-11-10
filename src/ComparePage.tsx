import { useEffect, useState } from 'react'
import { useI18n } from './i18n/LocaleContext.tsx'
import { localizeFeature } from './i18n/format.ts'
import { comparisonRows, planColumns, type FeatureValue, type PlanColumnId } from './plans.ts'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import SiteHeader from './SiteHeader.tsx'
import type { SignupIntent } from './waitlist'

function Icon({ name }: { name: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (name === 'save') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v8M9.5 10.5c.6-1 1.4-1.4 2.5-1.4 1.4 0 2.4.7 2.4 1.8s-.9 1.6-2.4 1.9-2.4.7-2.4 1.9 1 1.8 2.4 1.8c1.1 0 1.9-.4 2.5-1.3" />
      </svg>
    )
  }
  if (name === 'send') {
    return (
      <svg {...common}>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    )
  }
  if (name === 'atm') {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M7 10h4M7 14h2M3 18h18" />
      </svg>
    )
  }
  if (name === 'fx') {
    return (
      <svg {...common}>
        <path d="M7 8h7a3 3 0 0 1 0 6H9" />
        <path d="M17 16H10a3 3 0 0 1 0-6h5" />
      </svg>
    )
  }
  if (name === 'stock') {
    return (
      <svg {...common}>
        <path d="M4 16l5-5 3 3 8-8" />
        <path d="M14 6h6v6" />
      </svg>
    )
  }
  if (name === 'card') {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
      </svg>
    )
  }
  if (name === 'plane') {
    return (
      <svg {...common}>
        <path d="M3 12l18-7-7 18-2-7-9-4z" />
      </svg>
    )
  }
  if (name === 'shop') {
    return (
      <svg {...common}>
        <path d="M4 9h16l-1.2 10H5.2L4 9z" />
        <path d="M8 9V7a4 4 0 0 1 8 0v2" />
      </svg>
    )
  }
  if (name === 'bag') {
    return (
      <svg {...common}>
        <path d="M6 8h12l-1 12H7L6 8z" />
        <path d="M9 8V7a3 3 0 0 1 6 0v1" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M12 3l2.2 6.4H21l-5.4 3.9 2 6.4L12 16.8 6.4 19.7l2-6.4L3 9.4h6.8L12 3z" />
    </svg>
  )
}

function Check() {
  return (
    <svg className="rev-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12.5 9.2 17 19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Cell({ value }: { value: FeatureValue }) {
  if (value === true) return <span className="rev-check"><Check /></span>
  if (value === false) return <span className="rev-dash">—</span>
  return <span className="rev-value">{value}</span>
}

const groupIcon = { bank: 'card', travel: 'plane', brand: 'shop' }

export default function ComparePage() {
  const { t, locale } = useI18n()
  const rows = comparisonRows.filter((row) => row.id !== 'planFee')
  const groups = [...new Set(rows.map((row) => row.group))]
  const [intent, setIntent] = useState<SignupIntent | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [openHint, setOpenHint] = useState<string | null>(null)
  const groupLabel = {
    bank: t.compare.groupBank,
    travel: t.compare.groupTravel,
    brand: t.compare.groupBrand,
  }
  const colName: Record<PlanColumnId, string> = {
    account: t.plans.basicName,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }

  useEffect(() => {
    if (!openHint) return
    function close() {
      setOpenHint(null)
    }
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [openHint])

  return (
    <div className="page">
      <SiteHeader active="compare" onRequest={() => setIntent('account')} />
      <div className="compare-sheet">
        <main className="wrap compare-main">
          <p className="compare-kicker">{t.compare.kicker}</p>
          <h1>{t.compare.title}</h1>
          <p className="compare-lead">{t.compare.lead}</p>

          <div className="rev-board">
            <div className="rev-head">
              <div className="rev-corner" />
              {planColumns.map((col) => (
                <div key={col.id} className={`rev-plan${col.id === 'plus' ? ' is-featured' : ''}`}>
                  {col.id === 'plus' ? <span className="rev-badge">{t.plans.recommended}</span> : <span className="rev-badge rev-badge-spacer" />}
                  <h2>{colName[col.id]}</h2>
                  <button type="button" className="rev-get" onClick={() => setIntent(col.id)}>
                    {t.plans.request}
                  </button>
                  <span className="rev-picked">
                    <Check />
                  </span>
                </div>
              ))}
            </div>

            {groups.map((group) => (
              <div key={group}>
                <div className="rev-section">
                  <span className="rev-section-label">
                    <span className="rev-ico">
                      <Icon name={groupIcon[group]} />
                    </span>
                    {groupLabel[group]}
                  </span>
                </div>
                {rows
                  .filter((row) => row.group === group)
                  .map((row) => (
                    <div key={row.id} className="rev-row">
                      <div className="rev-feat">
                        <span className="rev-ico">
                          <Icon name={row.icon} />
                        </span>
                        <span>{t.compare.rows[row.id]}</span>
                        <button
                          type="button"
                          className="rev-info"
                          aria-label={`${t.compare.info}: ${t.compare.rows[row.id]}`}
                          aria-expanded={openHint === row.id}
                          aria-controls={openHint === row.id ? `hint-${row.id}` : undefined}
                          onClick={() => setOpenHint((current) => (current === row.id ? null : row.id))}
                        >
                          i
                        </button>
                        {openHint === row.id && t.compare.hints[row.id] && (
                          <span className="rev-hint" id={`hint-${row.id}`} role="tooltip">
                            {t.compare.hints[row.id]}
                          </span>
                        )}
                      </div>
                      {planColumns.map((col) => (
                        <div key={col.id} className={`rev-cell${col.id === 'plus' ? ' is-featured' : ''}`}>
                          <Cell value={localizeFeature(row.values[col.id], t, locale)} />
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </main>
        <footer>
          <div className="wrap foot compare-foot">
            <span>{t.footer.legal}</span>
            <a
              className="foot-linkedin"
              href="https://www.linkedin.com/company/getaure"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0z"
                />
              </svg>
              {t.footer.linkedin}
            </a>
          </div>
        </footer>
      </div>

      {intent && (
        <SignupModal
          intent={intent}
          cycle={intent === 'account' ? 'none' : 'monthly'}
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
