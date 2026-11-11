import { useEffect, useState, type FormEvent } from 'react'
import { confirmTokenFromLocation, withBase } from './base.ts'
import LangSwitch from './LangSwitch.tsx'
import ThemeSwitch from './ThemeSwitch.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { CONFIRM_CODE_DIGITS, CONFIRM_CODE_RE } from './confirmCode.ts'
import { confirmWaitlist } from './waitlist.ts'
import LogoMark from './LogoMark.tsx'

const TOKEN_RE = /^[a-f0-9]{32,128}$/i
const linkConfirms = new Map<string, ReturnType<typeof confirmWaitlist>>()

function confirmFromLink(token: string) {
  const existing = linkConfirms.get(token)
  if (existing) return existing
  const pending = confirmWaitlist({ token })
  linkConfirms.set(token, pending)
  return pending
}

export default function ConfirmPage() {
  const { t } = useI18n()
  const linkToken = confirmTokenFromLocation()
  const fromLink = linkToken.length > 0
  const tokenOk = TOKEN_RE.test(linkToken)
  const [status, setStatus] = useState<'form' | 'working' | 'ok' | 'error'>(
    fromLink ? (tokenOk ? 'working' : 'error') : 'form',
  )
  const [purpose, setPurpose] = useState<'waitlist' | 'support'>('waitlist')
  const [detail, setDetail] = useState(fromLink && !tokenOk ? t.confirm.missing : '')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!tokenOk) return
    let cancelled = false
    void confirmFromLink(linkToken)
      .then((result) => {
        if (cancelled) return
        if (result.purpose === 'support') setPurpose('support')
        setStatus('ok')
        const next = withBase('confirm')
        window.history.replaceState({}, '', next.startsWith('/') ? next : `/${next}`)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus('error')
        setDetail(err instanceof Error ? err.message : '')
      })
    return () => {
      cancelled = true
    }
  }, [tokenOk, linkToken])

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
            <ThemeSwitch />
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
        ) : status === 'working' ? (
          <>
            <p className="eyebrow">
              <span className="dot" /> {t.confirm.kicker}
            </p>
            <h1>{t.confirm.working}</h1>
            <p className="lead">{t.confirm.wait}</p>
          </>
        ) : fromLink ? (
          <>
            <p className="eyebrow">
              <span className="dot" /> {t.confirm.kicker}
            </p>
            <h1>{t.confirm.errTitle}</h1>
            <p className="lead">{detail || t.confirm.fail}</p>
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
              placeholder="1234"
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
