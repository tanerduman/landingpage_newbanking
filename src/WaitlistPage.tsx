import { useEffect, useMemo, useState } from 'react'
import { withBase } from './base.ts'
import {
  CYCLE_FILTERS,
  CYCLE_LABELS,
  PACKAGE_FILTERS,
  PACKAGE_LABELS,
  countByCycle,
  countByIntent,
  formatRequestTime,
  fetchWaitlist,
  downloadWaitlistExcel,
  type BillingCycle,
  type SignupIntent,
  type WaitlistEntry,
} from './waitlist'
import { fetchVisitStats, loadVisitStats, type VisitStats } from './visits.ts'
import WaitlistPie from './WaitlistPie.tsx'

type Filter = 'all' | SignupIntent
type CycleFilter = 'all' | BillingCycle

const PAGE_SIZE = 10

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [visits, setVisits] = useState<VisitStats>(() => loadVisitStats())
  const [remote, setRemote] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
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
  }, [])

  const counts = useMemo(() => countByIntent(entries), [entries])
  const cycleCounts = useMemo(() => countByCycle(entries), [entries])
  const monthlyEntries = useMemo(() => entries.filter((e) => e.cycle === 'monthly'), [entries])
  const yearlyEntries = useMemo(() => entries.filter((e) => e.cycle === 'yearly'), [entries])
  const visible = useMemo(
    () =>
      entries.filter((e) => {
        if (filter !== 'all' && e.intent !== filter) return false
        if (cycleFilter !== 'all' && e.cycle !== cycleFilter) return false
        return true
      }),
    [entries, filter, cycleFilter],
  )
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function changeFilter(next: Filter) {
    setFilter(next)
    setPage(1)
  }

  function changeCycle(next: CycleFilter) {
    setCycleFilter(next)
    setPage(1)
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
            <a className="btn btn-ghost" href={withBase()}>
              Siteye dön
            </a>
          </div>
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
              Yalnızca e-postası onaylanmış talepler burada ve Excel’de durur. Üstte siteye giren kişi sayısı, altta
              paket talepleri var.
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
              onClick={() => changeFilter(item.id)}
            >
              <strong>{counts[item.id]}</strong>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="waitlist-stats waitlist-cycle-stats">
          {CYCLE_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`waitlist-stat ${cycleFilter === item.id ? 'active' : ''}`}
              onClick={() => changeCycle(item.id)}
            >
              <strong>{cycleCounts[item.id]}</strong>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="waitlist-pies">
          <WaitlistPie
            kicker="Aylık"
            title="Aylık paket dağılımı"
            counts={countByIntent(monthlyEntries)}
            total={monthlyEntries.length}
            active={filter}
            onSelect={changeFilter}
            hideAccount
          />
          <WaitlistPie
            kicker="Yıllık"
            title="Yıllık paket dağılımı"
            counts={countByIntent(yearlyEntries)}
            total={yearlyEntries.length}
            active={filter}
            onSelect={changeFilter}
            hideAccount
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Ad soyad</th>
                <th>E-posta</th>
                <th>Paket</th>
                <th>Dönem</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="waitlist-empty">
                    Bu filtrede henüz talep yok. Landing’den hesap veya paket kaydı oluşturunca burada listelenir.
                  </td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id}>
                    <td>{formatRequestTime(row.createdAt)}</td>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>
                      <span className={`pkg-pill pkg-${row.intent}`}>{PACKAGE_LABELS[row.intent]}</span>
                    </td>
                    <td>
                      <span className={`pkg-pill cycle-${row.cycle ?? 'monthly'}`}>
                        {CYCLE_LABELS[row.cycle] ?? 'Aylık'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {visible.length > PAGE_SIZE && (
          <div className="waitlist-pager">
            <span>
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visible.length)} / {visible.length}
            </span>
            <div className="waitlist-pager-btns">
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                Önceki
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === currentPage ? 'active' : ''}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
                Sonraki
              </button>
            </div>
          </div>
        )}
        <p className="waitlist-note">
          {remote
            ? 'Onaylanmamış kayıtlar listede yok. Aynı e-posta (Gmail nokta/+ varyantları dahil) tek satırdır; paket değişince güncellenir.'
            : 'Sunucuya bağlanılamadı. Bu ekran yalnızca bu tarayıcıdaki kayıtları gösteriyor.'}
        </p>
      </main>
    </div>
  )
}
