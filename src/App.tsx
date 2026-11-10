import { useEffect, useState } from 'react'
import { withBase } from './base.ts'
import { comparisonRows, planColumns, plans } from './plans.ts'
import { apiFetch, readApiJson } from './api.ts'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import GoldExample from './GoldExample.tsx'
import IdleExample from './IdleExample.tsx'
import MonthSlogan from './MonthSlogan.tsx'
import Simulator from './Simulator.tsx'
import LangSwitch from './LangSwitch.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { formatFx, formatMoney, localizeFeature } from './i18n/format.ts'
import { type PlanId, type SignupIntent } from './waitlist'
import LogoMark from './LogoMark.tsx'

type Cycle = 'monthly' | 'yearly'

const fxBases = ['USD', 'EUR'] as const

type FxQuote = { base: string; quote: string; rate: number }

function Cell({ value, yes }: { value: string | boolean; yes: string }) {
  if (value === true) return <span className="yes">{yes}</span>
  if (value === false) return <span className="no">—</span>
  return <span>{value}</span>
}

function CardBrand() {
  return (
    <span className="card-brand">
      <LogoMark className="card-brand-mark" />
      AURE
    </span>
  )
}

export default function App() {
  const { t, locale } = useI18n()
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [selected, setSelected] = useState<PlanId | null>(null)
  const [focus, setFocus] = useState<{ id: PlanId; tick: number } | null>(null)
  const [intent, setIntent] = useState<SignupIntent>('account')
  const [faq, setFaq] = useState<number | null>(0)
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [fx, setFx] = useState<FxQuote[]>([])
  const [fxError, setFxError] = useState('')

  const period = cycle === 'yearly' ? t.plans.perYear : t.plans.perMonth
  const planCopy = {
    standard: {
      blurb: t.plans.standardBlurb,
      banking: t.plans.standardBanking,
      travel: t.plans.standardTravel,
      campaigns: t.plans.standardCampaigns,
    },
    plus: {
      blurb: t.plans.plusBlurb,
      banking: t.plans.plusBanking,
      travel: t.plans.plusTravel,
      campaigns: t.plans.plusCampaigns,
    },
    premium: {
      blurb: t.plans.premiumBlurb,
      banking: t.plans.premiumBanking,
      travel: t.plans.premiumTravel,
      campaigns: t.plans.premiumCampaigns,
    },
  } as const

  function openAccount() {
    setIntent('account')
    setModal(true)
  }

  function openPlan(id: PlanId) {
    setSelected(id)
    setIntent(id)
    setModal(true)
  }

  function focusPlan(id: PlanId, scroll = false) {
    setSelected(id)
    setFocus({ id, tick: Date.now() })
    if (scroll) document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function chooseCycle(next: Cycle) {
    setCycle(next)
    setFocus((current) => (current ? { id: current.id, tick: Date.now() } : current))
  }

  function closeModal() {
    setModal(false)
  }

  useEffect(() => {
    let cancelled = false
    async function loadFx() {
      const res = await apiFetch('/api/rates')
      const data = await readApiJson<{ quotes?: FxQuote[]; error?: string }>(res)
      if (cancelled) return
      if (res?.ok && data?.quotes?.length) {
        setFx(data.quotes)
        setFxError('')
        return
      }
      setFxError(data?.error || 'unavailable')
    }
    void loadFx()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page">
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="logo" href="#top">
            <LogoMark />
            AURE
          </a>
          <nav className="nav-links">
            <a href="#plans">{t.nav.plans}</a>
            <a href="#features">{t.nav.features}</a>
            <a href="#app">{t.nav.app}</a>
            <a href={withBase('compare')}>{t.nav.compare}</a>
            <a href={withBase('campaigns')}>{t.nav.campaigns}</a>
            <a className="nav-support" href={withBase('support')}>
              {t.nav.support}
              <span className="nav-new">{t.nav.newPage}</span>
            </a>
            <a href="#faq">{t.nav.faq}</a>
          </nav>
          <div className="nav-cta">
            <LangSwitch />
            <a className="btn btn-solid" href="#plans">
              {t.nav.seePlans}
            </a>
            <button className="btn btn-ghost" onClick={openAccount}>
              {t.nav.openFree}
            </button>
            <button className="menu-btn" aria-label={t.nav.menu} onClick={() => setMenu((v) => !v)}>
              ☰
            </button>
          </div>
        </div>
        <div className={`wrap mobile-drawer ${menu ? 'open' : ''}`}>
          <a href="#plans" onClick={() => setMenu(false)}>
            {t.nav.plans}
          </a>
          <a href="#features" onClick={() => setMenu(false)}>
            {t.nav.features}
          </a>
          <a href="#app" onClick={() => setMenu(false)}>
            {t.nav.app}
          </a>
          <a href={withBase('compare')} onClick={() => setMenu(false)}>
            {t.nav.compare}
          </a>
          <a href={withBase('campaigns')} onClick={() => setMenu(false)}>
            {t.nav.campaigns}
          </a>
          <a className="nav-support" href={withBase('support')} onClick={() => setMenu(false)}>
            {t.nav.support}
            <span className="nav-new">{t.nav.newPage}</span>
          </a>
          <a href="#faq" onClick={() => setMenu(false)}>
            {t.nav.faq}
          </a>
        </div>
      </header>

      <main id="top">
        <div className="wrap hero">
          <div>
            <div className="eyebrow">
              <span className="dot" /> {t.hero.eyebrow}
            </div>
            <h1>{t.hero.title}</h1>
            <p className="lead">{t.hero.lead}</p>
            <div className="hero-actions">
              <button className="btn btn-solid" onClick={openAccount}>
                {t.nav.openFree}
              </button>
              <a className="btn btn-ghost" href="#simulator">
                {t.hero.simulatorCta}
              </a>
            </div>
            <div className="stats">
              <div>
                <strong>0 ₺</strong>
                <span>{t.hero.statEft}</span>
              </div>
              <div>
                <strong>🌙</strong>
                <span>{t.hero.statInterest}</span>
              </div>
              <div>
                <strong>3–6</strong>
                <span>{t.hero.statOffers}</span>
              </div>
            </div>
          </div>

          <div className={`stage is-${intent === 'account' ? 'account' : selected}`}>
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

        <div className="fx-board wrap">
          <div className="fx-head">
            <span className="eyebrow">
              <span className="dot" /> {t.fx.eyebrow}
            </span>
            <p>{t.fx.lead}</p>
          </div>
          <div className="fx-grid">
            {(fx.length
              ? fx.filter((row) => (fxBases as readonly string[]).includes(row.base))
              : fxBases.map((base) => ({ base, quote: 'TRY', rate: 0 }))
            ).map(
              (row) => (
                <div key={row.base} className="fx-card">
                  <span>
                    {row.base}/{row.quote}
                  </span>
                  <strong>{row.rate ? formatFx(row.rate, locale) : '—'}</strong>
                </div>
              ),
            )}
          </div>
          {fxError && (
            <p className="fx-error">
              {t.fx.error} ({fxError}).
            </p>
          )}
        </div>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {Array.from({ length: 10 }, () =>
              fx.length
                ? fx
                    .filter((row) => (fxBases as readonly string[]).includes(row.base))
                    .map((row) => `${row.base}/${row.quote} ${formatFx(row.rate, locale)}`)
                : fxBases.map((c) => `${c}/TRY`),
            )
              .flat()
              .map((label, i) => (
                <span key={`${label}-${i}`}>{label}</span>
              ))}
          </div>
        </div>

        <section className="section ivory" id="plans">
          <div className="wrap">
            <div className="account-banner">
              <div>
                <span className="badge">{t.plans.badge}</span>
                <h2>{t.plans.bannerTitle}</h2>
                <p>{t.plans.bannerBody}</p>
              </div>
              <button className="btn btn-solid" onClick={openAccount}>
                {t.plans.bannerCta}
              </button>
            </div>

            <div className="section-head">
              <div>
                <h2>{t.plans.upgradeTitle}</h2>
              </div>
              <div>
                <p>{t.plans.upgradeLead}</p>
                <div className="toggle" role="tablist" aria-label={t.plans.billingAria}>
                  <button className={cycle === 'monthly' ? 'active' : ''} onClick={() => chooseCycle('monthly')}>
                    {t.plans.monthly}
                  </button>
                  <button className={cycle === 'yearly' ? 'active' : ''} onClick={() => chooseCycle('yearly')}>
                    {t.plans.yearly} <span className="save-tag">{t.plans.saveTag}</span>
                  </button>
                </div>
              </div>
            </div>

            <Simulator
              cycleYearly={cycle === 'yearly'}
              focus={focus}
              onFocus={focusPlan}
              onPick={openPlan}
              eurTry={fx.find((row) => row.base === 'EUR')?.rate ?? 0}
            />

            <div className="plans">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`plan-card ${selected === plan.id ? 'selected' : ''}`}
                  onClick={() => focusPlan(plan.id, true)}
                >
                  <div className="plan-kicker">
                    {plan.featured ? t.plans.featured : t.plans.optional}
                    {plan.featured && <span className="badge">Premium</span>}
                  </div>
                  <h3>{plan.name}</h3>
                  <div className="price">
                    {formatMoney(cycle === 'yearly' ? Math.round(plan.monthly * 10) : plan.monthly, locale)}
                    <span> {period}</span>
                  </div>
                  <p style={{ margin: 0, color: 'inherit', opacity: 0.75 }}>{planCopy[plan.id].blurb}</p>
                  <p className="perk-heading">{t.plans.banking}</p>
                  <ul>
                    {planCopy[plan.id].banking.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                  <p className="perk-heading">{t.plans.travel}</p>
                  <ul>
                    {planCopy[plan.id].travel.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                  <p className="perk-heading">{t.plans.brands}</p>
                  <ul>
                    {planCopy[plan.id].campaigns.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                  {selected === plan.id && (
                    <button
                      type="button"
                      className="btn btn-solid plan-add"
                      onClick={(e) => {
                        e.stopPropagation()
                        openPlan(plan.id)
                      }}
                    >
                      {t.plans.addPlan}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="wrap features">
            <div className="feature-copy">
              <div className="eyebrow">
                <span className="dot" /> {t.features.eyebrow}
              </div>
              <h2>{t.features.title}</h2>
              <p className="lead">{t.features.lead}</p>
            </div>
            <div className="feature-grid">
              <article className="feature-tile">
                <div className="icon">Fx</div>
                <h3>{t.features.fxTitle}</h3>
                <p>{t.features.fxBody}</p>
              </article>
              <article className="feature-tile">
                <div className="icon">%</div>
                <h3>{t.features.saveTitle}</h3>
                <p>{t.features.saveBody}</p>
              </article>
              <article className="feature-tile">
                <div className="icon">↑</div>
                <h3>{t.features.stockTitle}</h3>
                <p>{t.features.stockBody}</p>
              </article>
              <article className="feature-tile">
                <div className="icon">🛒</div>
                <h3>{t.features.campTitle}</h3>
                <p>
                  {t.features.campBody} <a href={withBase('campaigns')}>{t.features.campLink}</a>
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="app">
          <div className="wrap">
            <div className="section-head">
              <h2>{t.app.title}</h2>
              <p>{t.app.lead}</p>
            </div>
            <div className="phones">
              <figure className="phone-shot">
                <div className="phone">
                  <img
                    src={withBase('app/aure-app-wallets.jpg')}
                    alt={t.app.walletsAlt}
                  />
                  <div className="phone-overlay dock">
                    <span className="phone-chip">{t.app.walletsGold}</span>
                    <span className="phone-toast">
                      <strong>{t.app.walletsInterest}</strong>
                      {t.app.walletsEarned}
                    </span>
                  </div>
                </div>
                <figcaption>
                  <strong>{t.app.wallets}</strong>
                  {t.app.walletsCap}
                </figcaption>
              </figure>
              <figure className="phone-shot featured-shot">
                <div className="phone">
                  <img
                    src={withBase('app/aure-app-fx-compare.jpg')}
                    alt={t.app.orderAlt}
                  />
                </div>
                <figcaption>
                  <strong>{t.app.order}</strong>
                  {t.app.orderCap}
                </figcaption>
              </figure>
              <figure className="phone-shot">
                <div className="phone">
                  <img
                    src={withBase('app/aure-app-fx-premium.jpg')}
                    alt={t.app.tradeAlt}
                  />
                  <span className="phone-live">{t.app.tradeLive}</span>
                </div>
                <figcaption>
                  <strong>{t.app.trade}</strong>
                  {t.app.tradeCap}
                </figcaption>
              </figure>
            </div>
            <MonthSlogan />
            <IdleExample onPick={openPlan} eurTry={fx.find((row) => row.base === 'EUR')?.rate ?? 0} />
            <GoldExample onPick={openPlan} />
          </div>
        </section>

        <section className="section" id="compare" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="section-head">
              <h2>{t.homeCompare.title}</h2>
              <p>{t.homeCompare.lead}</p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.homeCompare.feature}</th>
                    {planColumns.map((col) => (
                      <th key={col.id} className="center">
                        {col.id === 'account' ? t.pkg.account : col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.id}>
                      <td>{t.compare.rows[row.id]}</td>
                      {planColumns.map((col) => (
                        <td key={`${row.id}-${col.id}`} className="center">
                          <Cell value={localizeFeature(row.values[col.id], t, locale)} yes={t.homeCompare.yes} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 18 }}>
              <a className="btn btn-solid" href={withBase('compare')}>
                {t.homeCompare.all}
              </a>
            </p>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 12 }}>
          <div className="wrap">
            <div className="section-head">
              <h2>{t.lifestyle.title}</h2>
              <p>{t.lifestyle.lead}</p>
            </div>
            <div className="lifestyle">
              <article className="life-card a">
                <span>{t.lifestyle.bank}</span>
                <h3>{t.lifestyle.bankTitle}</h3>
                <p>{t.lifestyle.bankBody}</p>
              </article>
              <article className="life-card b">
                <span>{t.lifestyle.camp}</span>
                <h3>{t.lifestyle.campTitle}</h3>
                <p>{t.lifestyle.campBody}</p>
              </article>
              <article className="life-card c">
                <span>{t.lifestyle.send}</span>
                <h3>{t.lifestyle.sendTitle}</h3>
                <p>{t.lifestyle.sendBody}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="faq" style={{ paddingTop: 24 }}>
          <div className="wrap faq-wrap">
            <div>
              <h2>{t.faq.title}</h2>
              <p className="lead" style={{ color: 'var(--muted)' }}>
                {t.faq.lead}
              </p>
            </div>
            <div>
              {t.faq.items.map((item, i) => (
                <div className="faq-item" key={item.q}>
                  <button className="faq-q" onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i}>
                    {item.q}
                    <span>{faq === i ? '–' : '+'}</span>
                  </button>
                  <div className={`faq-a ${faq === i ? 'open' : ''}`}>{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="wrap">
          <div className="cta-band">
            <div>
              <h2>{t.cta.title}</h2>
              <p>{t.cta.body}</p>
            </div>
            <button className="btn btn-dark" onClick={openAccount}>
              {t.cta.button}
            </button>
          </div>
        </div>
      </main>

      <footer>
        <div className="wrap foot">
          <span>{t.footer.legal}</span>
          <span>
            {t.pkg.account} · Standard · Plus · Premium
          </span>
        </div>
      </footer>

      {modal && (
        <SignupModal
          intent={intent}
          cycle={intent === 'account' ? 'none' : cycle}
          onClose={(msg) => {
            closeModal()
            if (msg) setToast(msg)
          }}
        />
      )}
      {toast && <SignupToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
