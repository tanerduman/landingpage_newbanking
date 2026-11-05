import { useState } from 'react'
import { withBase } from './base.ts'
import { campaignDetails, planColumns, type PlanColumnId } from './plans.ts'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import ThemeToggle from './ThemeToggle.tsx'
import type { SignupIntent } from './waitlist'

function rateLabel(value: string | boolean) {
  if (value === true) return 'Var'
  if (value === false) return 'Kapalı'
  return value
}

function firstPlanWithCampaign(rates: Record<PlanColumnId, string | boolean>): SignupIntent {
  if (rates.standard) return 'standard'
  if (rates.plus) return 'plus'
  if (rates.premium) return 'premium'
  return 'account'
}

export default function CampaignsPage() {
  const [intent, setIntent] = useState<SignupIntent | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  return (
    <div className="page compare-shell">
      <header className="nav compare-nav">
        <div className="wrap nav-inner">
          <a className="logo" href={withBase()}>
            <span className="logo-mark">A</span>
            AURE
          </a>
          <div className="waitlist-nav-actions">
            <ThemeToggle />
            <a className="btn btn-ghost" href={withBase('compare')}>
              Karşılaştır
            </a>
            <a className="btn btn-ghost" href={withBase()}>
              Siteye dön
            </a>
          </div>
        </div>
      </header>

      <main className="wrap compare-main">
        <p className="compare-kicker">Kampanyalar</p>
        <h1>Paketindeki marka ayrıcalıkları.</h1>
        <p className="compare-lead">
          Migros, Sanal Market, Divan Pastanesi ve Setur. Paketsiz hesapta kapalı; Standard, Plus ve Premium’da oran
          paketine göre açılır.
        </p>

        <div className="campaign-list">
          {campaignDetails.map((item) => (
            <article key={item.id} id={item.id} className="campaign-card">
              <div className="campaign-copy">
                <span className="campaign-cat">{item.category}</span>
                <h2>{item.name}</h2>
                <p>{item.summary}</p>
                <p className="campaign-how">
                  <strong>Nasıl kullanılır.</strong> {item.how}
                </p>
                <p className="campaign-note">{item.note}</p>
                <button
                  type="button"
                  className="btn btn-solid"
                  onClick={() => setIntent(firstPlanWithCampaign(item.rates))}
                >
                  Bu kampanya için paket ekle
                </button>
              </div>
              <div className="campaign-rates">
                {planColumns.map((col) => (
                  <div key={col.id} className={`campaign-rate ${item.rates[col.id] ? 'on' : 'off'}`}>
                    <span>{col.name}</span>
                    <strong>{rateLabel(item.rates[col.id])}</strong>
                  </div>
                ))}
              </div>
            </article>
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
