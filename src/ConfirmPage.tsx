import { useState, type FormEvent } from 'react'
import { withBase } from './base.ts'
import LangSwitch from './LangSwitch.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { CONFIRM_CODE_DIGITS, CONFIRM_CODE_RE } from './confirmCode.ts'
import { confirmWaitlist } from './waitlist.ts'
import LogoMark from './LogoMark.tsx'

export default function ConfirmPage() {
  const { t } = useI18n()
  const [status, setStatus] = useState<'form' | 'ok' | 'error'>('form')
  const [purpose, setPurpose] = useState<'waitlist' | 'support'>('waitlist')
  const [detail, setDetail] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setDetail(t.signup.needEmail)
      setStatus('error')
      return
    }
    if (!CONFIRM_CODE_RE.test(code.trim())) {
      setDetail(t.signup.needCode)
      setStatus('error')
      return
    }
    setBusy(true)
    setDetail('')
    try {
      const result = await confirmWaitlist({ email, code })
      if (result.purpose === 'support') setPurpose('support')
      setStatus('ok')
    } catch (err) {
      setStatus('error')
      setDetail(err instanceof Error ? err.message : '')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page waitlist-page">
      <header className="nav">
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
      <main className="wrap waitlist-main">
        {status === 'ok' ? (
          <>
            <p className="eyebrow">
              <span className="dot" /> {t.confirm.kicker}
            </p>
            <h1>{t.confirm.okTitle}</h1>
            <p className="lead">{purpose === 'support' ? t.confirm.successSupport : t.confirm.success}</p>
          </>
        ) : (
          <form className="login-card" onSubmit={submit}>
            <p className="eyebrow">
              <span className="dot" /> {t.confirm.kicker}
            </p>
            <h1>{t.confirm.kicker}</h1>
            <p className="lead">{t.confirm.intro}</p>
            <label htmlFor="confirm-email">{t.confirm.email}</label>
            <input
              id="confirm-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="confirm-code">{t.confirm.code}</label>
            <input
              id="confirm-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              maxLength={CONFIRM_CODE_DIGITS}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CONFIRM_CODE_DIGITS))}
              placeholder="12345678"
            />
            {status === 'error' && detail ? <p className="login-error">{detail}</p> : null}
            <button type="submit" className="btn btn-solid login-submit" disabled={busy}>
              {t.confirm.submit}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
