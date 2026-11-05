import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { fetchApiHealth } from './api.ts'
import { withBase } from './base.ts'
import { isWaitlistAuthed, loginWaitlist, logoutWaitlist } from './waitlistAuth'
import {
  PACKAGE_FILTERS,
  PACKAGE_LABELS,
  countByIntent,
  formatRequestTime,
  fetchWaitlist,
  downloadWaitlistExcel,
  type SignupIntent,
  type WaitlistEntry,
} from './waitlist'
import { fetchVisitStats, loadVisitStats, type VisitStats } from './visits.ts'

type Filter = 'all' | SignupIntent

export default function WaitlistPage() {
  const [authed, setAuthed] = useState(false)
  const [locked, setLocked] = useState(false)
  const [ready, setReady] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [busy, setBusy] = useState(false)
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [visits, setVisits] = useState<VisitStats>(() => loadVisitStats())
  const [remote, setRemote] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    async function boot() {
      const health = await fetchApiHealth()
      if (health?.authRequired && !isWaitlistAuthed()) {
        setLocked(true)
        setAuthed(false)
        setReady(true)
        return
      }
      setLocked(false)
      setAuthed(true)
      setReady(true)
    }
    void boot()
  }, [])

  useEffect(() => {
    if (!authed) return
    async function refresh() {
      const [list, stats] = await Promise.all([fetchWaitlist(), fetchVisitStats()])
      setEntries(list.entries)
      setRemote(list.remote)
      setVisits(stats)
    }
    function onRefresh() {
      void refresh()
    }
    void refresh()
    window.addEventListener('aure-waitlist', onRefresh)
    window.addEventListener('aure-visits', onRefresh)
    window.addEventListener('storage', onRefresh)
    const timer = window.setInterval(onRefresh, 15_000)
    return () => {
      window.removeEventListener('aure-waitlist', onRefresh)
      window.removeEventListener('aure-visits', onRefresh)
      window.removeEventListener('storage', onRefresh)
      window.clearInterval(timer)
    }
  }, [authed])

  const counts = useMemo(() => countByIntent(entries), [entries])
  const visible = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.intent === filter)),
    [entries, filter],
  )

  async function submitLogin(e: FormEvent) {
    e.preventDefault()
    setLoginError('')
    setBusy(true)
    const ok = await loginWaitlist(username, password)
    setBusy(false)
    if (!ok) {
      setLoginError('Kullanıcı adı veya şifre hatalı.')
      setPassword('')
      return
    }
    setPassword('')
    const [list, stats] = await Promise.all([fetchWaitlist(), fetchVisitStats()])
    setEntries(list.entries)
    setRemote(list.remote)
    setVisits(stats)
    setLocked(false)
    setAuthed(true)
  }

  function logout() {
    logoutWaitlist()
    setLocked(true)
    setAuthed(false)
    setEntries([])
    setUsername('')
    setPassword('')
    setFilter('all')
  }

  return (
    <div className="page waitlist-page">
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="logo" href={withBase()}>
            <span className="logo-mark">A</span>
            AURE
          </a>
          <div className="waitlist-nav-actions">
            {authed && (
              <button
                type="button"
                className="btn btn-solid"
                disabled={visible.length === 0}
                onClick={() =>
                  downloadWaitlistExcel(
                    visible,
                    PACKAGE_FILTERS.find((item) => item.id === filter)?.label ?? 'Tumu',
                  )
                }
              >
                Excel’e aktar
              </button>
            )}
            {authed && isWaitlistAuthed() && (
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Çıkış
              </button>
            )}
            <a className="btn btn-ghost" href={withBase()}>
              Siteye dön
            </a>
          </div>
        </div>
      </header>

      {!ready ? (
        <main className="wrap waitlist-main">
          <p className="lead">Yükleniyor…</p>
        </main>
      ) : locked ? (
        <main className="wrap waitlist-main waitlist-login-wrap">
          <form className="login-card" onSubmit={submitLogin}>
            <div className="eyebrow">
              <span className="dot" /> Yönetici girişi
            </div>
            <h1>Waiting list</h1>
            <p className="lead">Talepleri yalnızca giriş yapan yönetici görür.</p>
            <label htmlFor="waitlist-user">Kullanıcı adı</label>
            <input
              id="waitlist-user"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label htmlFor="waitlist-pass">Şifre</label>
            <input
              id="waitlist-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {loginError && <p className="login-error">{loginError}</p>}
            <button type="submit" className="btn btn-solid login-submit" disabled={busy}>
              {busy ? 'Kontrol ediliyor…' : 'Giriş yap'}
            </button>
          </form>
        </main>
      ) : (
        <main className="wrap waitlist-main">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <span className="dot" /> Waiting list
              </div>
              <h1>Gelen talepler</h1>
              <p className="lead">
                Landing’den gelen her kayıt paketine göre burada durur. Üstte siteye giren kişi sayısı, altta paket
                talepleri var.
              </p>
            </div>
          </div>

          <div className="traffic-stats">
            <div className="waitlist-stat traffic">
              <strong>{visits.unique}</strong>
              <span>Tekil ziyaretçi</span>
            </div>
            <div className="waitlist-stat traffic">
              <strong>{visits.views}</strong>
              <span>Site girişi (oturum)</span>
            </div>
            <div className="waitlist-stat traffic">
              <strong>{entries.length}</strong>
              <span>Paket / hesap talebi</span>
            </div>
            <div className="waitlist-stat traffic">
              <strong>
                {visits.unique === 0 ? '—' : `${Math.round((entries.length / visits.unique) * 100)}%`}
              </strong>
              <span>Talebe dönüşüm</span>
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
          <p className="waitlist-note">
            {remote
              ? 'Ziyaretçi sayısı ve talepler ortak veritabanında durur; başka bilgisayarlardan gelen tıklamalar da burada görünür.'
              : 'Sunucuya bağlanılamadı. Bu ekran yalnızca bu tarayıcıdaki kayıtları gösteriyor.'}
          </p>
        </main>
      )}
    </div>
  )
}
