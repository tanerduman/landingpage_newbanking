import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from './i18n/LocaleContext.tsx'
import { loadNextPopup, markPopupSeen, type SitePopup } from './popupCopy.ts'
import { SignupToast } from './SignupModal.tsx'
import Spinner from './Spinner.tsx'
import { ensureVisitorId } from './visits.ts'
import type { PopupText } from './popupCopyData.ts'

const HIDE_KEY = 'aure-popup-hide'

function hiddenThisVisit() {
  try {
    return sessionStorage.getItem(HIDE_KEY) === '1'
  } catch {
    return false
  }
}

function hideThisVisit() {
  try {
    sessionStorage.setItem(HIDE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export default function WeekendAsk({ active }: { active: boolean }) {
  const { t, locale } = useI18n()
  const titleId = useId()
  const visitorId = useRef('')
  const [popup, setPopup] = useState<SitePopup | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<'yes' | 'no' | null>(null)
  const [error, setError] = useState('')
  const [thanks, setThanks] = useState(false)

  useEffect(() => {
    if (!active || hiddenThisVisit()) return
    let live = true
    let timer = 0
    async function openNext() {
      if (!live) return
      if (document.querySelector('.modal')) {
        timer = window.setTimeout(() => void openNext(), 400)
        return
      }
      const visitor = ensureVisitorId()
      if (!visitor) return
      visitorId.current = visitor
      const next = await loadNextPopup(visitor)
      if (!live || !next) return
      hideThisVisit()
      setPopup(next)
      setOpen(true)
      void markPopupSeen(visitor, next.id)
    }
    timer = window.setTimeout(() => void openNext(), 3000)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [active])

  function dismiss() {
    hideThisVisit()
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

  const busy = pending !== null

  async function choose(answer: 'yes' | 'no') {
    if (!popup || pending) return
    setPending(answer)
    setError('')
    const result = await markPopupSeen(visitorId.current, popup.id, answer)
    setPending(null)
    if (result !== 'ok') {
      setError(t.fxAsk.fail)
      return
    }
    setOpen(false)
    setThanks(true)
  }

  function line(text: PopupText) {
    return text[locale]
  }

  if (!open || !popup) {
    return thanks ? <SignupToast message={t.fxAsk.thanks} onClose={() => setThanks(false)} /> : null
  }

  const kicker = line(popup.kicker)
  const tag = line(popup.tag)

  return (
    <div className="fx-ask" role="presentation" onClick={(event) => event.target === event.currentTarget && dismiss()}>
      <div className="fx-ask-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="fx-ask-close" onClick={dismiss} aria-label={t.fxAsk.close}>
          ×
        </button>
        {kicker || tag ? (
          <p className="fx-ask-kicker">
            <span className="dot" />
            {kicker}
            {tag ? <span className="fx-ask-days">{tag}</span> : null}
          </p>
        ) : null}
        <h2 id={titleId}>{line(popup.question)}</h2>
        {error && <p className="fx-ask-error">{error}</p>}
        <div className="fx-ask-actions">
          <button type="button" className="fx-ask-yes" disabled={busy} aria-busy={pending === 'yes'} onClick={() => void choose('yes')}>
            <span>
              {pending === 'yes' ? <Spinner /> : null}
              {line(popup.yes)}
            </span>
            <i aria-hidden="true">→</i>
          </button>
          <button type="button" className="fx-ask-no" disabled={busy} aria-busy={pending === 'no'} onClick={() => void choose('no')}>
            {pending === 'no' ? <Spinner /> : null}
            {line(popup.no)}
          </button>
        </div>
      </div>
    </div>
  )
}
