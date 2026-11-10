import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { withBase } from './base.ts'
import LangSwitch from './LangSwitch.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import {
  countByCycle,
  countByIntent,
  formatRequestTime,
  fetchWaitlist,
  deleteWaitlistEntry,
  downloadSupportExcel,
  downloadWaitlistExcel,
  loginWaitlist,
  logoutWaitlist,
  type BillingCycle,
  type SignupIntent,
  type WaitlistEntry,
} from './waitlist'
import { fetchVisitStats, loadVisitStats, type VisitStats } from './visits.ts'
import { fetchSupport, deleteSupportEntry, type SupportEntry, type SupportKind } from './support.ts'
import SupportPie from './SupportPie.tsx'
import WaitlistPie from './WaitlistPie.tsx'
import LogoMark from './LogoMark.tsx'

type Filter = 'all' | SignupIntent
type CycleFilter = 'all' | BillingCycle
type KindFilter = 'all' | SupportKind
type Panel = 'requests' | 'support'

const PAGE_SIZE = 10

export default function WaitlistPage() {
  const { t, locale } = useI18n()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [support, setSupport] = useState<SupportEntry[]>([])
  const [panel, setPanel] = useState<Panel>('requests')
  const [visits, setVisits] = useState<VisitStats>(() => loadVisitStats())
  const [remote, setRemote] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>('all')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [page, setPage] = useState(1)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const removedIds = useRef(new Set<string>())
  const removedSupportIds = useRef(new Set<string>())

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
      const list = await fetchWaitlist()
      if (!list.authorized) {
        setAuthed(false)
        setEntries([])
        setSupport([])
        setRemote(false)
        return
      }
      setAuthed(true)
      const [stats, tickets] = await Promise.all([fetchVisitStats(), fetchSupport()])
      setEntries(list.entries.filter((entry) => !removedIds.current.has(entry.id)))
      for (const id of removedIds.current) {
        if (!list.entries.some((entry) => entry.id === id)) removedIds.current.delete(id)
      }
      setSupport(tickets.entries.filter((entry) => !removedSupportIds.current.has(entry.id)))
      for (const id of removedSupportIds.current) {
        if (!tickets.entries.some((entry) => entry.id === id)) removedSupportIds.current.delete(id)
      }
      setRemote(list.remote)
      setVisits(stats)
    }
    function onRefresh() {
      void refresh()
    }
    void refresh()
    if (!authed) return
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

  async function submitLogin(e: FormEvent) {
    e.preventDefault()
    if (user.trim().length < 2) {
      setLoginError(t.waitlist.needUser)
      return
    }
    if (!password) {
      setLoginError(t.waitlist.needPass)
      return
    }
    setLoginBusy(true)
    setLoginError('')
    try {
      await loginWaitlist(user, password)
      setPassword('')
      setAuthed(true)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : t.errors.auth_bad)
    } finally {
      setLoginBusy(false)
    }
  }

  async function signOut() {
    await logoutWaitlist()
    setAuthed(false)
    setEntries([])
    setSupport([])
    setPassword('')
  }

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
  const supportCounts = useMemo(() => {
    const counts: Record<SupportKind, number> = { complaint: 0, suggestion: 0, support: 0 }
    for (const row of support) counts[row.kind] += 1
    return counts
  }, [support])
  const visibleSupport = useMemo(
    () => support.filter((row) => kindFilter === 'all' || row.kind === kindFilter),
    [support, kindFilter],
  )
  const supportPageCount = Math.max(1, Math.ceil(visibleSupport.length / PAGE_SIZE))
  const supportPage = Math.min(page, supportPageCount)
  const pagedSupport = visibleSupport.slice((supportPage - 1) * PAGE_SIZE, supportPage * PAGE_SIZE)
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

  function changeKind(next: SupportKind) {
    setKindFilter((current) => (current === next ? 'all' : next))
    setPage(1)
    setConfirmId(null)
  }

  function changePanel(next: Panel) {
    setPanel(next)
    setPage(1)
    setKindFilter('all')
    setConfirmId(null)
    setDeleteError('')
  }

  async function removeEntry(id: string) {
    if (deletingId) return
    if (confirmId !== id) {
      setConfirmId(id)
      setDeleteError('')
      return
    }
    setDeletingId(id)
    setDeleteError('')
    try {
      await deleteWaitlistEntry(id)
      removedIds.current.add(id)
      setEntries((current) => current.filter((entry) => entry.id !== id))
      setConfirmId(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t.errors.delete_fail)
      setConfirmId(null)
    } finally {
      setDeletingId(null)
    }
  }

  async function removeSupport(id: string) {
    if (deletingId) return
    if (confirmId !== id) {
      setConfirmId(id)
      setDeleteError('')
      return
    }
    setDeletingId(id)
    setDeleteError('')
    try {
      await deleteSupportEntry(id)
      removedSupportIds.current.add(id)
      setSupport((current) => current.filter((entry) => entry.id !== id))
      setConfirmId(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t.errors.support_delete_fail)
      setConfirmId(null)
    } finally {
      setDeletingId(null)
    }
  }

  const filterLabel = packageFilters.find((item) => item.id === filter)?.label ?? t.pkg.all

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
            {authed && (
              <button type="button" className="btn btn-ghost" onClick={signOut}>
                {t.waitlist.logout}
              </button>
            )}
            {authed && panel === 'requests' && (
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
            )}
            {authed && panel === 'support' && (
              <button
                type="button"
                className="btn btn-solid"
                disabled={visibleSupport.length === 0}
                onClick={() =>
                  downloadSupportExcel(visibleSupport, {
                    date: t.waitlist.excelDate,
                    name: t.waitlist.excelName,
                    email: t.waitlist.excelEmail,
                    kind: t.support.kind,
                    message: t.waitlist.message,
                    sheet: t.waitlist.tabSupport,
                    kinds: t.support.kinds,
                    locale,
                  })
                }
              >
                {t.waitlist.export}
              </button>
            )}
            <a className="btn btn-ghost" href={withBase()}>
              {t.nav.back}
            </a>
          </div>
        </div>
      </header>

      <main className="wrap waitlist-main">
        {authed === null ? null : !authed ? (
          <div className="waitlist-login-wrap">
            <form className="login-card" onSubmit={submitLogin}>
              <p className="eyebrow">
                <span className="dot" /> {t.waitlist.loginKicker}
              </p>
              <h1>{t.waitlist.loginTitle}</h1>
              <p className="lead">{t.waitlist.loginLead}</p>
              <label htmlFor="waitlist-user">{t.waitlist.loginUser}</label>
              <input
                id="waitlist-user"
                autoComplete="username"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              />
              <label htmlFor="waitlist-pass">{t.waitlist.loginPassword}</label>
              <input
                id="waitlist-pass"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {loginError && <p className="login-error">{loginError}</p>}
              <button type="submit" className="btn btn-solid login-submit" disabled={loginBusy}>
                {t.waitlist.loginSubmit}
              </button>
            </form>
          </div>
        ) : (
          <>
        <div className="admin-tabs" role="tablist" aria-label={t.waitlist.tabsLabel}>
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'requests'}
            className={panel === 'requests' ? 'active' : ''}
            onClick={() => changePanel('requests')}
          >
            {t.waitlist.tabRequests}
            <span>{entries.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'support'}
            className={panel === 'support' ? 'active' : ''}
            onClick={() => changePanel('support')}
          >
            {t.waitlist.tabSupport}
            <span>{support.length}</span>
          </button>
        </div>
        {panel === 'support' ? (
          <>
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  <span className="dot" /> {t.support.kicker}
                </div>
                <h1>{t.waitlist.tabSupport}</h1>
                <p className="lead">{t.waitlist.supportLead}</p>
              </div>
            </div>
            <div className="waitlist-pies">
              <SupportPie
                counts={supportCounts}
                total={support.length}
                active={kindFilter}
                onSelect={changeKind}
              />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.waitlist.date}</th>
                    <th>{t.waitlist.name}</th>
                    <th>{t.waitlist.email}</th>
                    <th>{t.support.kind}</th>
                    <th>{t.waitlist.message}</th>
                    <th className="row-action">{t.waitlist.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSupport.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="waitlist-empty">
                        {support.length === 0 ? t.waitlist.supportEmpty : t.waitlist.supportFilterEmpty}
                      </td>
                    </tr>
                  ) : (
                    pagedSupport.map((row) => (
                      <tr key={row.id}>
                        <td>{formatRequestTime(row.createdAt, locale)}</td>
                        <td>{row.name}</td>
                        <td>{row.email}</td>
                        <td>
                          <span className={`pkg-pill kind-${row.kind}`}>{t.support.kinds[row.kind]}</span>
                        </td>
                        <td className="support-message">{row.message}</td>
                        <td className="row-action">
                          <button
                            type="button"
                            className={`row-delete${confirmId === row.id ? ' armed' : ''}`}
                            disabled={deletingId === row.id}
                            aria-label={
                              confirmId === row.id
                                ? `${t.waitlist.deleteConfirm} ${row.name}`
                                : `${t.waitlist.delete} ${row.name}`
                            }
                            onClick={() => void removeSupport(row.id)}
                          >
                            {deletingId === row.id
                              ? t.waitlist.deleting
                              : confirmId === row.id
                                ? t.waitlist.deleteConfirm
                                : t.waitlist.delete}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {deleteError && <p className="waitlist-action-error">{deleteError}</p>}
            {visibleSupport.length > PAGE_SIZE && (
              <div className="waitlist-pager">
                <span>
                  {(supportPage - 1) * PAGE_SIZE + 1}–{Math.min(supportPage * PAGE_SIZE, visibleSupport.length)} / {visibleSupport.length}
                </span>
                <div className="waitlist-pager-btns">
                  <button type="button" disabled={supportPage <= 1} onClick={() => setPage(supportPage - 1)}>
                    {t.waitlist.prev}
                  </button>
                  <button type="button" disabled={supportPage >= supportPageCount} onClick={() => setPage(supportPage + 1)}>
                    {t.waitlist.next}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
        <div className="section-head">
          <div>
            <div className="eyebrow">
              <span className="dot" /> {t.waitlist.kicker}
            </div>
            <h1>{t.waitlist.title}</h1>
            <p className="lead">{t.waitlist.lead}</p>
          </div>
        </div>

        {visits.scope === 'preview' && <p className="traffic-scope">{t.waitlist.previewNote}</p>}
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
                <th className="row-action">{t.waitlist.action}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="waitlist-empty">
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
                    <td className="row-action">
                      <button
                        type="button"
                        className={`row-delete${confirmId === row.id ? ' armed' : ''}`}
                        disabled={deletingId === row.id}
                        aria-label={
                          confirmId === row.id
                            ? `${t.waitlist.deleteConfirm} ${row.name}`
                            : `${t.waitlist.delete} ${row.name}`
                        }
                        onClick={() => void removeEntry(row.id)}
                      >
                        {deletingId === row.id
                          ? t.waitlist.deleting
                          : confirmId === row.id
                            ? t.waitlist.deleteConfirm
                            : t.waitlist.delete}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {deleteError && <p className="waitlist-action-error">{deleteError}</p>}
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
          </>
        )}
          </>
        )}
      </main>
    </div>
  )
}
