import { useEffect, useState, type FormEvent } from 'react'
import { withBase } from './base.ts'
import { CONFIRM_CODE_DIGITS, CONFIRM_CODE_RE } from './confirmCode.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import SiteHeader from './SiteHeader.tsx'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import { submitSupport, SUPPORT_KINDS, type SupportKind } from './support.ts'
import { useSpeechDraft } from './useSpeechDraft.ts'
import { confirmWaitlist, fetchConfirmStatus, onWaitlistConfirmed } from './waitlist.ts'

const MESSAGE_MAX = 2_000
const MESSAGE_WARN = Math.round(MESSAGE_MAX * 0.9)

export default function SupportPage() {
  const { t, locale } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [kind, setKind] = useState<SupportKind | ''>('')
  const [message, setMessage] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState('')
  const [statusToken, setStatusToken] = useState('')
  const [phase, setPhase] = useState<'form' | 'code'>('form')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [micBlocked, setMicBlocked] = useState(false)
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const { supported, listening, toggle, stop } = useSpeechDraft({
    lang: locale === 'en' ? 'en-US' : 'tr-TR',
    value: message,
    onChange: setMessage,
    maxLength: MESSAGE_MAX,
    onBlocked: () => setMicBlocked(true),
  })
  const usedChars = message.length
  const countLocale = locale === 'en' ? 'en-GB' : 'tr-TR'
  const usedLabel = usedChars.toLocaleString(countLocale)
  const maxLabel = MESSAGE_MAX.toLocaleString(countLocale)

  useEffect(() => {
    if (phase !== 'form') stop()
  }, [phase, stop])

  useEffect(() => () => stop(), [stop])

  useEffect(() => {
    if (phase !== 'code' || !statusToken || sent) return
    let done = false
    function finish() {
      if (done) return
      done = true
      setSent(true)
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
      done = true
      stop()
      window.clearInterval(timer)
    }
  }, [phase, email, statusToken, sent])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (phase === 'code') {
      if (!CONFIRM_CODE_RE.test(code.trim())) {
        setError(t.signup.needCode)
        return
      }
      setBusy(true)
      setError('')
      try {
        await confirmWaitlist({ email, code })
        setSent(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : t.signup.confirmFail)
      } finally {
        setBusy(false)
      }
      return
    }
    if (name.trim().length < 2) {
      setError(t.support.needName)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t.support.needEmail)
      return
    }
    if (!kind) {
      setError(t.support.needKind)
      return
    }
    if (message.trim().length < 8) {
      setError(t.support.needMessage)
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await submitSupport({ name, email, kind, message })
      setDevCode(result.devCode || '')
      setStatusToken(result.statusToken)
      setPhase('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.save_fail)
    } finally {
      setBusy(false)
    }
  }

  const heading = sent ? t.support.successTitle : phase === 'code' ? t.signup.confirmEmail : t.support.title
  const lead = sent ? t.support.success : phase === 'code' ? `${email} ${t.signup.codeSent}` : t.support.lead

  return (
    <div className="page">
      <SiteHeader active="support" onRequest={() => setModal(true)} />
      <main className="wrap support-page">
        <p className="hero-kicker">
          <span className="dot" /> {t.support.kicker}
        </p>
        <h1>{heading}</h1>
        <p className="support-lead">{lead}</p>
        {sent ? (
          <a className="btn btn-solid support-back" href={withBase()}>
            {t.nav.back}
          </a>
        ) : (
            <form className="support-form" onSubmit={submit}>
              {phase === 'form' ? (
                <>
                  <label htmlFor="support-name">{t.support.name}</label>
                  <input
                    id="support-name"
                    autoComplete="name"
                    value={name}
                    placeholder={t.support.namePh}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <label htmlFor="support-email">{t.support.email}</label>
                  <input
                    id="support-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    placeholder="ada@email.com"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <fieldset className="kind-field">
                    <legend>{t.support.kind}</legend>
                    <div className="kind-options">
                      {SUPPORT_KINDS.map((item) => (
                        <label key={item} className={kind === item ? 'active' : ''}>
                          <input
                            type="radio"
                            name="support-kind"
                            value={item}
                            checked={kind === item}
                            onChange={() => setKind(item)}
                          />
                          {t.support.kinds[item]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="support-message-head">
                    <label htmlFor="support-message">{t.support.message}</label>
                    {supported && (
                      <button
                        type="button"
                        className={`dictate-btn${listening ? ' live' : ''}`}
                        aria-pressed={listening}
                        onClick={() => {
                          setMicBlocked(false)
                          toggle()
                        }}
                      >
                        {listening ? t.support.dictateStop : t.support.dictate}
                      </button>
                    )}
                  </div>
                  <textarea
                    id="support-message"
                    value={message}
                    placeholder={t.support.messagePh}
                    rows={6}
                    maxLength={MESSAGE_MAX}
                    aria-describedby="support-message-count"
                    onChange={(e) => {
                      stop()
                      setMessage(e.target.value.slice(0, MESSAGE_MAX))
                    }}
                  />
                  <div
                    className={`message-meter${usedChars >= MESSAGE_WARN ? ' warn' : ''}`}
                    aria-label={t.support.charsOf.replace('{used}', usedLabel).replace('{max}', maxLabel)}
                  >
                    <span className="message-meter-track" aria-hidden="true">
                      <span className="message-meter-fill" style={{ width: `${(usedChars / MESSAGE_MAX) * 100}%` }} />
                    </span>
                    <span id="support-message-count" className="message-meter-count">
                      {usedLabel} <span>/ {maxLabel}</span>
                    </span>
                  </div>
                  {micBlocked && <p className="support-dictate-note">{t.support.dictateDenied}</p>}
                </>
              ) : (
                <>
                  <label htmlFor="support-code">{t.signup.codeLabel}</label>
                  <input
                    id="support-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    maxLength={CONFIRM_CODE_DIGITS}
                    placeholder="12345678"
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CONFIRM_CODE_DIGITS))}
                  />
                  {devCode ? (
                    <p className="confirm-dev">
                      {t.signup.devCode} {devCode}
                    </p>
                  ) : null}
                </>
              )}
              {error && <p className="support-error">{error}</p>}
              <button type="submit" className="btn btn-solid support-submit" disabled={busy}>
                {busy ? t.support.sending : phase === 'code' ? t.signup.confirm : t.signup.sendCode}
              </button>
            </form>
        )}
      </main>
      <footer>
        <div className="wrap foot">
          <span>{t.footer.legal}</span>
        </div>
      </footer>
      {modal && (
        <SignupModal
          intent="account"
          cycle="none"
          onClose={(msg) => {
            setModal(false)
            if (msg) setToast(msg)
          }}
        />
      )}
      {toast && <SignupToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
