import { useState } from 'react'
import { withBase } from './base.ts'
import LangSwitch from './LangSwitch.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { localizeFeature } from './i18n/format.ts'
import { campaignDetails, planColumns, type PlanColumnId } from './plans.ts'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import type { SignupIntent } from './waitlist'
import LogoMark from './LogoMark.tsx'

function firstPlanWithCampaign(rates: Record<PlanColumnId, string | boolean>): SignupIntent {
  if (rates.standard) return 'standard'
  if (rates.plus) return 'plus'
  if (rates.premium) return 'premium'
  return 'account'
}

export default function CampaignsPage() {
  const { t, locale } = useI18n()
  const [intent, setIntent] = useState<SignupIntent | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const colName: Record<PlanColumnId, string> = {
    account: t.pkg.account,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }
  const cat = { Market: t.campaigns.market, Yiyecek: t.campaigns.food, Seyahat: t.campaigns.travel }

  return (
    <div className="page compare-shell">
      <header className="nav compare-nav">
        <div className="wrap nav-inner">
          <a className="logo" href={withBase()}>
            <LogoMark />
            AURE
          </a>
          <div className="waitlist-nav-actions">
            <LangSwitch />
            <a className="btn btn-ghost" href={withBase('compare')}>
              {t.nav.compare}
            </a>
            <a className="btn btn-ghost" href={withBase()}>
              {t.nav.back}
            </a>
          </div>
        </div>
      </header>

      <main className="wrap compare-main">
        <p className="compare-kicker">{t.campaigns.kicker}</p>
        <h1>{t.campaigns.title}</h1>
        <p className="compare-lead">{t.campaigns.lead}</p>

        <div className="campaign-list">
          {campaignDetails.map((item) => {
            const copy = t.campaigns.items[item.id]
            const rateLabel = (value: string | boolean) => {
              if (value === true) return t.campaigns.on
              if (value === false) return t.campaigns.off
              const localized = localizeFeature(value, t, locale)
              return typeof localized === 'string' ? localized : value
            }
            return (
              <article key={item.id} id={item.id} className="campaign-card">
                <div className="campaign-copy">
                  <span className="campaign-cat">{cat[item.category as keyof typeof cat] ?? item.category}</span>
                  <h2>{copy?.title ?? item.name}</h2>
                  <p>{copy?.summary}</p>
                  <p className="campaign-how">
                    <strong>{t.campaigns.how}</strong> {copy?.how}
                  </p>
                  <p className="campaign-note">{copy?.note}</p>
                  <button
                    type="button"
                    className="btn btn-solid"
                    onClick={() => setIntent(firstPlanWithCampaign(item.rates))}
                  >
                    {t.campaigns.add}
                  </button>
                </div>
                <div className="campaign-rates">
                  {planColumns.map((col) => (
                    <div key={col.id} className={`campaign-rate ${item.rates[col.id] ? 'on' : 'off'}`}>
                      <span>{colName[col.id]}</span>
                      <strong>{rateLabel(item.rates[col.id])}</strong>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
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
