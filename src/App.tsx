import { useState } from 'react'
import { withBase } from './base.ts'
import { plans, type PlanColumnId } from './plans.ts'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import SiteHeader from './SiteHeader.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { type PlanId, type SignupIntent } from './waitlist'
import HomeGuide from './HomeGuide.tsx'
import HowDeck from './HowDeck.tsx'
import LogoMark from './LogoMark.tsx'

function CardBrand() {
  return (
    <span className="card-brand">
      <LogoMark className="card-brand-mark" />
      AURE
    </span>
  )
}

const homePlanIds = ['standard', 'plus', 'premium'] as const satisfies readonly PlanId[]

export default function App() {
  const { t } = useI18n()
  const [selected, setSelected] = useState<PlanId | null>(null)
  const [intent, setIntent] = useState<SignupIntent>('account')
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const perks: Record<PlanColumnId, string[]> = {
    account: t.plans.accountPerks,
    standard: t.plans.standardPerks,
    plus: t.plans.plusPerks,
    premium: t.plans.premiumPerks,
  }

  function openAccount() {
    setIntent('account')
    setModal(true)
  }

  function openPlan(id: PlanId) {
    setSelected(id)
    setIntent(id)
    setModal(true)
  }

  function closeModal() {
    setModal(false)
  }

  return (
    <div className="page">
      <SiteHeader onRequest={openAccount} />

      <main id="top">
        <div className="wrap hero">
          <div>
            <p className="hero-kicker">
              <span className="dot" /> {t.hero.eyebrow}
            </p>
            <h1>{t.hero.title}</h1>
            <p className="lead">{t.hero.lead}</p>
            <div className="hero-actions">
              <button className="btn btn-solid" onClick={openAccount}>
                {t.nav.request}
              </button>
              <a className="btn btn-ghost" href="#plans">
                {t.nav.seePlans}
              </a>
            </div>
          </div>

          <div className={`stage is-${intent === 'account' ? 'account' : selected ?? 'account'}`}>
            <div className="card-stack" aria-hidden="true">
              <article className="bank-card card-account">
                <div className="card-top">
                  <span className="chip" />
                  <CardBrand />
                </div>
                <div>
                  <small>{t.hero.cardAccount}</small>
                  <b>•••• 2208</b>
                </div>
              </article>
              <article className="bank-card card-standard">
                <div className="card-top">
                  <span className="chip" />
                  <CardBrand />
                </div>
                <div>
                  <small>AURE Standard</small>
                  <b>•••• 4412</b>
                </div>
              </article>
              <article className="bank-card card-plus">
                <div className="card-top">
                  <span className="chip" />
                  <CardBrand />
                </div>
                <div>
                  <small>AURE Plus</small>
                  <b>•••• 8821</b>
                </div>
              </article>
              <article className="bank-card card-premium">
                <div className="card-top">
                  <span className="chip" />
                  <CardBrand />
                </div>
                <div>
                  <small>AURE Premium</small>
                  <b>•••• 1904</b>
                </div>
              </article>
            </div>
            <div className="float-pill pill-fx">
              <strong>{t.hero.pillSupport}</strong>
              {t.hero.pillSupportSub}
            </div>
            <div className="float-pill pill-atm">
              <strong>{t.hero.pillInterest}</strong>
              {t.hero.pillInterestSub}
            </div>
          </div>
        </div>

        <section className="section how" id="how">
          <div className="wrap">
            <h2>{t.how.title}</h2>
            <div className="how-grid">
              {t.how.steps.map((step, index) => (
                <article className="how-card" key={step.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
            <HowDeck />
          </div>
        </section>

        <section className="section plans-section" id="plans">
          <div className="wrap">
            <div className="plans-intro">
              <h2>{t.plans.homeTitle}</h2>
              <p>{t.plans.homeLead}</p>
            </div>
            <div className="plans plans-home">
              <article className="plan-card plan-quiet">
                <div className="plan-kicker">{t.plans.freeLabel}</div>
                <h3>{t.plans.basicName}</h3>
                <ul>
                  {perks.account.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
                <button type="button" className="plan-link" onClick={openAccount}>
                  {t.plans.request}
                </button>
              </article>
              {homePlanIds.map((id) => {
                const plan = plans.find((item) => item.id === id)
                if (!plan) return null
                return (
                  <article key={id} className="plan-card plan-quiet">
                    <div className="plan-kicker" />
                    <h3>{plan.name}</h3>
                    <ul>
                      {perks[id].map((perk) => (
                        <li key={perk}>{perk}</li>
                      ))}
                    </ul>
                    <button type="button" className="btn btn-solid plan-add" onClick={() => openPlan(id)}>
                      {t.plans.request}
                    </button>
                  </article>
                )
              })}
            </div>
            <p className="plans-note">{t.plans.homeNote}</p>
            <p className="plans-more">
              <a href={withBase('karsilastir')}>{t.plans.compareLink}</a>
            </p>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot">
          <span>{t.footer.legal}</span>
          <span className="foot-end">
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
            <span>
              {t.plans.basicName} · Standard · Plus · Premium
            </span>
          </span>
        </div>
      </footer>

      {modal && (
        <SignupModal
          intent={intent}
          cycle={intent === 'account' ? 'none' : 'monthly'}
          onClose={(msg) => {
            closeModal()
            if (msg) setToast(msg)
          }}
        />
      )}
      {toast && <SignupToast message={toast} onClose={() => setToast(null)} />}
      <HomeGuide />
    </div>
  )
}
