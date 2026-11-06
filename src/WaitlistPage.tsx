import { useEffect, useMemo, useState } from 'react'
import { withBase } from './base.ts'
import LangSwitch from './LangSwitch.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import {
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
  const { t, locale } = useI18n()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [visits, setVisits] = useState<VisitStats>(() => loadVisitStats())
  const [remote, setRemote] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>('all')
  const [page, setPage] = useState(1)

  const pkgLabels: Record<SignupIntent, string> = {
    account: t.pkg.account,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }
  const cycleLabels: Record<BillingCycle, string> = {
    none: t.cycle.none,
    monthly: t.cycle.monthly,
    yearly: t.cycle.yearly,
  }
  const packageFilters: { id: Filter; label: string }[] = [
    { id: 'all', label: t.pkg.all },
    { id: 'account', label: t.pkg.account },
    { id: 'standard', label: t.pkg.standard },
    { id: 'plus', label: t.pkg.plus },
    { id: 'premium', label: t.pkg.premium },
  ]
  const cycleFilters: { id: CycleFilter; label: string }[] = [
    { id: 'all', label: t.cycle.all },
    { id: 'monthly', label: t.cycle.monthly },
    { id: 'yearly', label: t.cycle.yearly },
    { id: 'none', label: t.cycle.none },
  ]

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

  const filterLabel = packageFilters.find((item) => item.id === filter)?.label ?? t.pkg.all

  return (
    <div className="page waitlist-page">
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="logo" href={withBase()}>
            <span className="logo-mark">A</span>
            AURE
          </a>
          <div className="waitlist-nav-actions">
            <LangSwitch />
            <button
              type="button"
              className="btn btn-solid"
              disabled={visible.length === 0}
              onClick={() =>
                downloadWaitlistExcel(visible, filterLabel, {
                  date: t.waitlist.excelDate,
                  name: t.waitlist.excelName,
                  email: t.waitlist.excelEmail,
                  pkg: t.waitlist.excelPkg,
                  cycle: t.waitlist.excelCycle,
                  sheet: t.waitlist.excelSheet,
                  packages: pkgLabels,
                  cycles: cycleLabels,
                  locale,
                })
              }
            >
              {t.waitlist.export}
            </button>
            <a className="btn btn-ghost" href={withBase()}>
              {t.nav.back}
            </a>
          </div>
        </div>
      </header>

      <main className="wrap waitlist-main">
        <div className="section-head">
          <div>
            <div className="eyebrow">
              <span className="dot" /> {t.waitlist.kicker}
            </div>
            <h1>{t.waitlist.title}</h1>
            <p className="lead">{t.waitlist.lead}</p>
          </div>
        </div>

        <div className="traffic-stats">
          <div className="waitlist-stat traffic">
            <strong>{visits.unique}</strong>
            <span>{t.waitlist.unique}</span>
          </div>
          <div className="waitlist-stat traffic">
            <strong>{visits.views}</strong>
            <span>{t.waitlist.views}</span>
          </div>
          <div className="waitlist-stat traffic">
            <strong>{entries.length}</strong>
            <span>{t.waitlist.requests}</span>
          </div>
          <div className="waitlist-stat traffic">
            <strong>{visits.unique === 0 ? '—' : `${Math.round((entries.length / visits.unique) * 100)}%`}</strong>
            <span>{t.waitlist.conversion}</span>
          </div>
        </div>

        <div className="waitlist-stats">
          {packageFilters.map((item) => (
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
          {cycleFilters.map((item) => (
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
            kicker={t.waitlist.pieMonth}
            title={t.waitlist.pieMonthTitle}
            counts={countByIntent(monthlyEntries)}
            total={monthlyEntries.length}
            active={filter}
            onSelect={changeFilter}
            hideAccount
          />
          <WaitlistPie
            kicker={t.waitlist.pieYear}
            title={t.waitlist.pieYearTitle}
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
                <th>{t.waitlist.date}</th>
                <th>{t.waitlist.name}</th>
                <th>{t.waitlist.email}</th>
                <th>{t.waitlist.package}</th>
                <th>{t.waitlist.period}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="waitlist-empty">
                    {t.waitlist.empty}
                  </td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id}>
                    <td>{formatRequestTime(row.createdAt, locale)}</td>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>
                      <span className={`pkg-pill pkg-${row.intent}`}>{pkgLabels[row.intent]}</span>
                    </td>
                    <td>
                      <span className={`pkg-pill cycle-${row.cycle ?? 'monthly'}`}>
                        {cycleLabels[row.cycle] ?? t.cycle.monthly}
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
                {t.waitlist.prev}
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
                {t.waitlist.next}
              </button>
            </div>
          </div>
        )}
        <p className="waitlist-note">{remote ? t.waitlist.noteRemote : t.waitlist.noteLocal}</p>
      </main>
    </div>
  )
}
