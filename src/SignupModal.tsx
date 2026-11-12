import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CONFIRM_CODE_DIGITS, CONFIRM_CODE_RE } from './confirmCode.ts'
import InterestAsk from './InterestAsk.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { plans } from './plans.ts'
import {
  addWaitlistEntry,
  confirmWaitlist,
  fetchConfirmStatus,
  onWaitlistConfirmed,
  type BillingCycle,
  type SignupIntent,
} from './waitlist'

export function SignupModal({
  intent,
  cycle = 'monthly',
  onClose,
}: {
  intent: SignupIntent
  cycle?: BillingCycle
  onClose: (toast?: string) => void
}) {
  const { t, locale } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'form' | 'code' | 'interest'>('form')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState('')
  const [statusToken, setStatusToken] = useState('')
  const [billing, setBilling] = useState<BillingCycle>(intent === 'account' ? 'none' : cycle)
  const plan = plans.find((p) => p.id === intent)
  const planName = intent === 'account' ? t.pkg.account : (plan?.name ?? t.pkg.standard)
  const successToast =
    intent === 'account' ? t.signup.successAccount : t.signup.successPlan.replace('{name}', planName)
  const onCloseRef = useRef(onClose)
  const finishedRef = useRef(false)
  const noteRef = useRef(successToast)
  const dismissRef = useRef<() => void>(() => {})
  dismissRef.current = () => {
    if (phase === 'interest') onClose(noteRef.current)
    else onClose()
  }

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismissRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (phase !== 'code' || !statusToken) return
    finishedRef.current = false
    function finish() {
      if (finishedRef.current) return
      finishedRef.current = true
      noteRef.current = successToast
      setPhase('interest')
    }
    const stop = onWaitlistConfirmed(email, finish)
    const timer = window.setInterval(() => {
      void fetchConfirmStatus(statusToken).then((confirmed) => {
        if (confirmed) finish()
      })
    }, 2500)
    void fetchConfirmStatus(statusToken).then((confirmed) => {
      if (confirmed) finish()
    })
    return () => {
      finishedRef.current = true
      stop()
      window.clearInterval(timer)
    }
  }, [phase, email, statusToken, successToast])

  function openInterest(note: string) {
    noteRef.current = note
    finishedRef.current = true
    setPhase('interest')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (phase === 'interest') return
    if (phase === 'code') {
      if (!CONFIRM_CODE_RE.test(code.trim())) {
        setError(t.signup.needCode)
        return
      }
      setBusy(true)
      setError('')
      try {
        await confirmWaitlist({ email, code })
        openInterest(successToast)
      } catch (err) {
        setError(err instanceof Error ? err.message : t.signup.confirmFail)
      } finally {
        setBusy(false)
      }
      return
    }
    if (name.trim().length < 2) {
      setError(t.signup.needName)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.signup.needEmail)
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await addWaitlistEntry({
        name,
        email,
        intent,
        lang: locale,
        cycle: intent === 'account' ? 'none' : billing === 'yearly' ? 'yearly' : 'monthly',
      })
      if (result.status === 'pending') {
        setDevCode(result.devCode || '')
        setStatusToken(result.statusToken || '')
        setPhase('code')
        return
      }
      if (result.status === 'updated') {
        openInterest(t.signup.updated)
        return
      }
      onClose(t.signup.received)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.signup.saveFail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismissRef.current()
      }}
    >
      <form className="modal-card" onSubmit={submit}>
        <button type="button" className="modal-close" onClick={() => dismissRef.current()} aria-label={t.signup.close}>
          ×
        </button>
        {phase === 'interest' ? (
          <InterestAsk
            email={email}
            intent={intent}
            onDone={(saved) => onClose(saved ? t.signup.interestSaved : noteRef.current)}
          />
        ) : (
          <>
        <h3 id="signup-title">
          {phase === 'code'
            ? t.signup.confirmEmail
            : intent === 'account'
              ? t.signup.openAccount
              : t.signup.addPlan.replace('{name}', planName)}
        </h3>
        {phase === 'form' ? (
          <>
            <p>{intent === 'account' ? t.signup.accountLead : t.signup.planLead}</p>
            <label htmlFor="full-name">{t.signup.name}</label>
            <input id="full-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.signup.namePh} />
            <label htmlFor="email">{t.signup.email}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ada@email.com"
            />
            {intent !== 'account' && (
              <>
                <label>{t.signup.period}</label>
                <div className="toggle" role="tablist" aria-label={t.signup.period}>
                  <button
                    type="button"
                    className={billing !== 'yearly' ? 'active' : ''}
                    onClick={() => setBilling('monthly')}
                  >
                    {t.plans.monthly}
                  </button>
                  <button
                    type="button"
                    className={billing === 'yearly' ? 'active' : ''}
                    onClick={() => setBilling('yearly')}
                  >
                    {t.plans.yearly} <span className="save-tag">{t.plans.saveTag}</span>
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <p>
              {email} {t.signup.codeSent}
            </p>
            <label htmlFor="confirm-code">{t.signup.codeLabel}</label>
            <input
              id="confirm-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              maxLength={CONFIRM_CODE_DIGITS}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CONFIRM_CODE_DIGITS))}
              placeholder="1234"
            />
            {devCode ? (
              <p className="confirm-dev">
                {t.signup.devCode} {devCode}
              </p>
            ) : null}
          </>
        )}
        {error && (
          <p className="login-error" style={{ marginBottom: 0 }}>
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="submit" className="btn btn-solid" disabled={busy}>
            {phase === 'code' ? t.signup.confirm : t.signup.sendCode}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onClose()}>
            {t.signup.cancel}
          </button>
        </div>
          </>
        )}
      </form>
    </div>
  )
}

export function SignupToast({ message, onClose }: { message: string; onClose: () => void }) {
  const { t } = useI18n()
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const timer = window.setTimeout(onClose, 4500)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(timer)
    }
  }, [onClose])

  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label={t.signup.close}>
        ×
      </button>
    </div>
  )
}
