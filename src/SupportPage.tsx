import { useState, type FormEvent } from 'react'
import { withBase } from './base.ts'
import LangSwitch from './LangSwitch.tsx'
import LogoMark from './LogoMark.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { submitSupport, SUPPORT_KINDS, type SupportKind } from './support.ts'

export default function SupportPage() {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [kind, setKind] = useState<SupportKind | ''>('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
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
      await submitSupport({ name, email, kind, message })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.save_fail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
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
      <main className="wrap support-main">
        <div className="login-card support-card">
          {sent ? (
            <>
              <p className="eyebrow">
                <span className="dot" /> {t.support.kicker}
              </p>
              <h1>{t.support.successTitle}</h1>
              <p className="lead">{t.support.success}</p>
              <a className="btn btn-solid login-submit" href={withBase()}>
                {t.nav.back}
              </a>
            </>
          ) : (
            <form onSubmit={submit}>
              <p className="eyebrow">
                <span className="dot" /> {t.support.kicker}
                <span className="nav-new">{t.nav.newPage}</span>
              </p>
              <h1>{t.support.title}</h1>
              <p className="lead">{t.support.lead}</p>
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
              <label htmlFor="support-message">{t.support.message}</label>
              <textarea
                id="support-message"
                value={message}
                placeholder={t.support.messagePh}
                rows={6}
                onChange={(e) => setMessage(e.target.value)}
              />
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="btn btn-solid login-submit" disabled={busy}>
                {busy ? t.support.sending : t.support.submit}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
