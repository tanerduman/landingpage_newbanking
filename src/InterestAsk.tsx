import { useState } from 'react'
import { INTEREST_SECTORS, saveInterest, type InterestSector } from './interest.ts'
import { useI18n } from './i18n/LocaleContext.tsx'

export default function InterestAsk({
  email,
  intent,
  onDone,
}: {
  email: string
  intent: string
  onDone: (saved: boolean) => void
}) {
  const { t } = useI18n()
  const [picked, setPicked] = useState<InterestSector[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const plan =
    intent === 'standard'
      ? t.pkg.standard
      : intent === 'plus'
        ? t.pkg.plus
        : intent === 'premium'
          ? t.pkg.premium
          : t.plans.basicName
  const later = intent === 'account'

  function toggle(id: InterestSector) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
    setError('')
  }

  async function save() {
    if (!picked.length) {
      setError(t.signup.interestNeed)
      return
    }
    setBusy(true)
    setError('')
    try {
      await saveInterest(email, picked)
      onDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.signup.saveFail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="interest-ask">
      <h3 id="signup-title">{t.signup.interestTitle}</h3>
      <p>{t.signup.interestReady.replace('{name}', plan)}</p>
      <p className="interest-ask-q">{later ? t.signup.interestAskLater : t.signup.interestAsk}</p>
      <p className="interest-hint">{t.signup.interestHint}</p>
      <div className="interest-chips" role="group" aria-label={later ? t.signup.interestAskLater : t.signup.interestAsk}>
        {INTEREST_SECTORS.map((id) => {
          const on = picked.includes(id)
          return (
            <button
              key={id}
              type="button"
              className={on ? 'interest-chip on' : 'interest-chip'}
              aria-pressed={on}
              onClick={() => toggle(id)}
            >
              {t.signup.sectors[id]}
            </button>
          )
        })}
      </div>
      {error ? <p className="login-error">{error}</p> : null}
      <div className="interest-actions">
        <button type="button" className="btn btn-solid" disabled={busy || picked.length === 0} onClick={() => void save()}>
          {t.signup.interestSave}
        </button>
        <button type="button" className="interest-skip" onClick={() => onDone(false)}>
          {t.signup.interestSkip}
        </button>
      </div>
    </div>
  )
}
