import { useEffect, useMemo, useState } from 'react'
import {
  PACKAGE_FILTERS,
  PACKAGE_LABELS,
  countByIntent,
  formatRequestTime,
  loadWaitlist,
  type SignupIntent,
  type WaitlistEntry,
} from './waitlist'

type Filter = 'all' | SignupIntent

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>(() => loadWaitlist())
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    function refresh() {
      setEntries(loadWaitlist())
    }
    window.addEventListener('aure-waitlist', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('aure-waitlist', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const counts = useMemo(() => countByIntent(entries), [entries])
  const visible = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.intent === filter)),
    [entries, filter],
  )

  return (
    <div className="page waitlist-page">
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="logo" href="/">
            <span className="logo-mark">A</span>
            AURE
          </a>
          <nav className="nav-links">
            <a href="/">Landing</a>
          </nav>
          <a className="btn btn-ghost" href="/">
            Siteye dön
          </a>
        </div>
      </header>

      <main className="wrap waitlist-main">
        <div className="section-head">
          <div>
            <div className="eyebrow">
              <span className="dot" /> Waiting list
            </div>
            <h1>Gelen talepler</h1>
            <p className="lead">
              Landing’den gelen her kayıt paketine göre burada durur. Filtreleyerek hangi paketin talep gördüğünü
              görürsün.
            </p>
          </div>
        </div>

        <div className="waitlist-stats">
          {PACKAGE_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`waitlist-stat ${filter === item.id ? 'active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              <strong>{counts[item.id]}</strong>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Ad soyad</th>
                <th>E-posta</th>
                <th>Paket</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={4} className="waitlist-empty">
                    Bu filtrede henüz talep yok. Landing’den hesap veya paket kaydı oluşturunca burada listelenir.
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr key={row.id}>
                    <td>{formatRequestTime(row.createdAt)}</td>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>
                      <span className={`pkg-pill pkg-${row.intent}`}>{PACKAGE_LABELS[row.intent]}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="waitlist-note">Kayıtlar bu tarayıcıda tutulur (demo). Gerçek bir sunucuya gitmez.</p>
      </main>
    </div>
  )
}
