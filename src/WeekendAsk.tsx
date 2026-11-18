import { useEffect, useId, useState } from 'react'
import { useI18n } from './i18n/LocaleContext.tsx'
import { SignupToast } from './SignupModal.tsx'
import { saveWeekendAnswer, type WeekendAnswer } from './weekendFx.ts'

const STORAGE_KEY = 'aure-weekend-fx'
const HIDE_KEY = 'aure-weekend-fx-hide'

function savedAnswer() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'yes' || value === 'no'
  } catch {
    return false
  }
}

function hiddenThisVisit() {
  try {
    return sessionStorage.getItem(HIDE_KEY) === '1'
  } catch {
    return false
  }
}

export default function WeekendAsk({ active }: { active: boolean }) {
  const { t } = useI18n()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [thanks, setThanks] = useState(false)

  useEffect(() => {
    if (!active || savedAnswer() || hiddenThisVisit()) return
    let live = true
    let timer = 0
    function tick() {
      if (!live) return
      if (document.querySelector('.modal')) {
        timer = window.setTimeout(tick, 400)
        return
      }
      setOpen(true)
    }
    timer = window.setTimeout(tick, 3000)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [active])

  function dismiss() {
    try {
      sessionStorage.setItem(HIDE_KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function choose(answer: WeekendAnswer) {
    if (busy) return
    setBusy(true)
    setError('')
    const ok = await saveWeekendAnswer(answer)
    setBusy(false)
    if (!ok) {
      setError(t.fxAsk.fail)
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, answer)
    } catch {
      /* ignore */
    }
    setOpen(false)
    setThanks(true)
  }

  if (!open) {
    return thanks ? <SignupToast message={t.fxAsk.thanks} onClose={() => setThanks(false)} /> : null
  }

  return (
    <div className="fx-ask" role="presentation" onClick={(event) => event.target === event.currentTarget && dismiss()}>
      <div className="fx-ask-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="fx-ask-close" onClick={dismiss} aria-label={t.fxAsk.close}>
          ×
        </button>
        <p className="fx-ask-kicker">
          <span className="dot" />
          {t.fxAsk.kicker}
          <span className="fx-ask-days">{t.fxAsk.days}</span>
        </p>
        <h2 id={titleId}>{t.fxAsk.question}</h2>
        {error && <p className="fx-ask-error">{error}</p>}
        <div className="fx-ask-actions">
          <button type="button" className="fx-ask-yes" disabled={busy} onClick={() => void choose('yes')}>
            <span>{t.fxAsk.yes}</span>
            <i aria-hidden="true">→</i>
          </button>
          <button type="button" className="fx-ask-no" disabled={busy} onClick={() => void choose('no')}>
            {t.fxAsk.no}
          </button>
        </div>
      </div>
    </div>
  )
}
