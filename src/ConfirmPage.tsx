import { useEffect, useState, type FormEvent } from 'react'
import { withBase } from './base.ts'
import LangSwitch from './LangSwitch.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { confirmWaitlist } from './waitlist.ts'
import LogoMark from './LogoMark.tsx'

function tokenFromLocation() {
  const query = new URLSearchParams(window.location.search).get('token')
  if (query) return query
  const hash = window.location.hash.replace(/^#/, '')
  const q = hash.indexOf('?')
  if (q === -1) return ''
  return new URLSearchParams(hash.slice(q + 1)).get('token') || ''
}

export default function ConfirmPage() {
  const { t } = useI18n()
  const token = tokenFromLocation()
  const [status, setStatus] = useState<'form' | 'working' | 'ok' | 'error'>(token ? 'working' : 'form')
  const [purpose, setPurpose] = useState<'waitlist' | 'support'>('waitlist')
  const [detail, setDetail] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    void confirmWaitlist({ token })
      .then((result) => {
        if (result.purpose === 'support') setPurpose('support')
        setStatus('ok')
      })
      .catch((err: unknown) => {
        setStatus('error')
        setDetail(err instanceof Error ? err.message : '')
      })
  }, [token])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setDetail(t.signup.needEmail)
      setStatus('error')
      return
    }
    if (!/^\d{6}$/.test(code.trim())) {
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

  const title = status === 'ok' ? t.confirm.okTitle : status === 'working' ? t.confirm.working : t.confirm.errTitle
  const message =
    status === 'working'
      ? t.confirm.wait
      : status === 'ok'
        ? purpose === 'support'
          ? t.confirm.successSupport
          : t.confirm.success
        : detail || t.confirm.fail

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
        {status === 'form' || (status === 'error' && !token) ? (
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
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
            {status === 'error' && detail ? <p className="login-error">{detail}</p> : null}
            <button type="submit" className="btn btn-solid login-submit" disabled={busy}>
              {t.confirm.submit}
            </button>
          </form>
        ) : (
          <>
            <p className="eyebrow">
              <span className="dot" /> {t.confirm.kicker}
            </p>
            <h1>{title}</h1>
            <p className="lead">{message}</p>
          </>
        )}
      </main>
    </div>
  )
}
