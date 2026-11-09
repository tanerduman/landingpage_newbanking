import { useEffect, useState } from 'react'
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
  const [status, setStatus] = useState<'working' | 'ok' | 'error' | 'missing'>(token ? 'working' : 'missing')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    if (!token) return
    void confirmWaitlist({ token })
      .then(() => {
        setStatus('ok')
      })
      .catch((err: unknown) => {
        setStatus('error')
        setDetail(err instanceof Error ? err.message : '')
      })
  }, [token])

  const title = status === 'ok' ? t.confirm.okTitle : status === 'working' ? t.confirm.working : t.confirm.errTitle
  const message =
    status === 'working'
      ? t.confirm.wait
      : status === 'ok'
        ? t.confirm.success
        : status === 'missing'
          ? t.confirm.missing
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
        <p className="eyebrow">
          <span className="dot" /> {t.confirm.kicker}
        </p>
        <h1>{title}</h1>
        <p className="lead">{message}</p>
      </main>
    </div>
  )
}
