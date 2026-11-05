import { useEffect, useState } from 'react'
import { withBase } from './base.ts'
import { confirmWaitlist } from './waitlist.ts'

function tokenFromLocation() {
  const query = new URLSearchParams(window.location.search).get('token')
  if (query) return query
  const hash = window.location.hash.replace(/^#/, '')
  const q = hash.indexOf('?')
  if (q === -1) return ''
  return new URLSearchParams(hash.slice(q + 1)).get('token') || ''
}

export default function ConfirmPage() {
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working')
  const [message, setMessage] = useState('Talebin onaylanıyor…')

  useEffect(() => {
    const token = tokenFromLocation()
    if (!token) {
      setStatus('error')
      setMessage('Onay bağlantısı eksik veya bozuk.')
      return
    }
    void confirmWaitlist({ token })
      .then(() => {
        setStatus('ok')
        setMessage('E-postan doğrulandı. Talebin waitlist’te.')
      })
      .catch((err: unknown) => {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Onay başarısız.')
      })
  }, [])

  return (
    <div className="page waitlist-page">
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="logo" href={withBase()}>
            <span className="logo-mark">A</span>
            AURE
          </a>
          <a className="btn btn-ghost" href={withBase()}>
            Siteye dön
          </a>
        </div>
      </header>
      <main className="wrap waitlist-main">
        <p className="eyebrow">
          <span className="dot" /> E-posta onayı
        </p>
        <h1>{status === 'ok' ? 'Onaylandı' : status === 'error' ? 'Onaylanamadı' : 'Onaylanıyor'}</h1>
        <p className="lead">{message}</p>
      </main>
    </div>
  )
}
