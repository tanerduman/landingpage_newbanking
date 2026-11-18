import { useEffect, useState } from 'react'
import { withBase } from './base.ts'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import SiteHeader from './SiteHeader.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { type SignupIntent } from './waitlist'
import HowDeck from './HowDeck.tsx'
import { defaultHeroCopy } from './heroCopyData.ts'
import { cachedHeroCopy, loadHeroCopy, type HeroCopy } from './heroCopy.ts'
import HeroFilm from './HeroFilm.tsx'

export default function App() {
  const { t, locale } = useI18n()
  const [intent, setIntent] = useState<SignupIntent>('account')
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [hero, setHero] = useState<HeroCopy | null>(cachedHeroCopy)

  useEffect(() => {
    if (hero) return
    let live = true
    void loadHeroCopy().then((next) => {
      if (live) setHero(next ?? defaultHeroCopy())
    })
    return () => {
      live = false
    }
  }, [hero])

  function openAccount() {
    setIntent('account')
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
            <h1 className={hero ? undefined : 'hero-pending'}>
              {hero ? (locale === 'en' ? hero.title.en : hero.title.tr) : null}
              {hero && t.hero.titleAccent ? <span className="hero-accent">{t.hero.titleAccent}</span> : null}
            </h1>
            <p className={hero ? 'lead' : 'lead hero-pending'}>{hero ? (locale === 'en' ? hero.lead.en : hero.lead.tr) : null}</p>
            <ul className="hero-checks">
              {t.hero.checks.map((item) => (
                <li key={item}>
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3.2 8.2 L6.4 11.4 L12.8 4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="hero-actions">
              <button className="btn btn-solid" onClick={openAccount}>
                {t.nav.queue}
              </button>
              <a className="btn btn-ghost" href={withBase('karsilastir')}>
                {t.nav.seePlans}
              </a>
            </div>
            <p className="hero-note">{t.hero.note}</p>
          </div>

          <HeroFilm />
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
            <p className="how-disclaimer">{t.how.disclaimer}</p>
            <HowDeck />
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
