import { useEffect, useState } from 'react'
import { apiFetch, readApiJson } from './api.ts'
import { withBase } from './base.ts'
import LangSwitch from './LangSwitch.tsx'
import LogoMark from './LogoMark.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import Simulator from './Simulator.tsx'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import type { PlanId, SignupIntent } from './waitlist'

type Cycle = 'monthly' | 'yearly'
type FxQuote = { base: string; quote: string; rate: number }

export default function CalculatorPage() {
  const { t } = useI18n()
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [focus, setFocus] = useState<{ id: PlanId; tick: number } | null>(null)
  const [intent, setIntent] = useState<SignupIntent | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [eurTry, setEurTry] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadFx() {
      const res = await apiFetch('/api/rates')
      const data = await readApiJson<{ quotes?: FxQuote[] }>(res)
      if (cancelled || !res?.ok) return
      const eur = data?.quotes?.find((row) => row.base === 'EUR')?.rate
      if (eur) setEurTry(eur)
    }
    void loadFx()
    return () => {
      cancelled = true
    }
  }, [])

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
            <a className="btn btn-ghost" href={withBase()}>
              {t.nav.back}
            </a>
          </div>
        </div>
      </header>

      <main className="wrap compare-main ivory">
        <p className="compare-kicker">{t.nav.calculator}</p>
        <h1>{t.hero.simulatorCta}</h1>
        <p className="compare-lead">{t.calculator.lead}</p>
        <div className="calculator-toolbar">
          <div className="toggle" role="tablist" aria-label={t.plans.billingAria}>
            <button type="button" className={cycle === 'monthly' ? 'active' : ''} onClick={() => setCycle('monthly')}>
              {t.plans.monthly}
            </button>
            <button type="button" className={cycle === 'yearly' ? 'active' : ''} onClick={() => setCycle('yearly')}>
              {t.plans.yearly} <span className="save-tag">{t.plans.saveTag}</span>
            </button>
          </div>
        </div>
        <Simulator
          cycleYearly={cycle === 'yearly'}
          focus={focus}
          onFocus={(id) => setFocus({ id, tick: Date.now() })}
          onPick={(id) => {
            setFocus({ id, tick: Date.now() })
            setIntent(id)
          }}
          eurTry={eurTry}
        />
      </main>

      {intent && (
        <SignupModal
          intent={intent}
          cycle={intent === 'account' ? 'none' : cycle}
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
