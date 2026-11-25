import { useEffect, useState } from 'react'
import { apiFetch, readApiJson } from './api.ts'
import SiteHeader from './SiteHeader.tsx'
import Simulator from './Simulator.tsx'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import { cachedFitOpen, loadFitOpen } from './fitGate.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import type { PlanId, SignupIntent } from './waitlist'

type FxQuote = { base: string; rate: number }

export default function FitPage() {
  const { t } = useI18n()
  const [open, setOpen] = useState<boolean | null>(cachedFitOpen())
  const [focus, setFocus] = useState<{ id: PlanId; tick: number } | null>(null)
  const [intent, setIntent] = useState<SignupIntent | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [eurTry, setEurTry] = useState(0)

  useEffect(() => {
    let cancelled = false
    void loadFitOpen().then((value) => {
      if (!cancelled) setOpen(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open) return
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
  }, [open])

  return (
    <div className="page">
      <SiteHeader active="fit" onRequest={() => setIntent('account')} />
      <main className="wrap fit-main">
        {open == null ? null : open ? (
          <>
            <p className="hero-kicker">
              <span className="dot" /> {t.fit.kicker}
            </p>
            <h1>{t.fit.title}</h1>
            <p className="fit-lead">{t.fit.lead}</p>
            <Simulator
              focus={focus}
              onFocus={(id) => setFocus({ id, tick: Date.now() })}
              onPick={(id) => {
                setFocus({ id, tick: Date.now() })
                setIntent(id)
              }}
              eurTry={eurTry}
            />
          </>
        ) : (
          <>
            <p className="hero-kicker">
              <span className="dot" /> {t.fit.kicker}
            </p>
            <h1>{t.fit.closedTitle}</h1>
            <p className="fit-lead">{t.fit.closedLead}</p>
          </>
        )}
      </main>
      <footer>
        <div className="wrap foot">
          <span>{t.footer.legal}</span>
        </div>
      </footer>
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
