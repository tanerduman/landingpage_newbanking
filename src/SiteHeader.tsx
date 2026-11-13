import { useEffect, useState } from 'react'
import { apiFetch, readApiJson } from './api.ts'
import { withBase } from './base.ts'
import LangSwitch from './LangSwitch.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { formatFx, formatGram } from './i18n/format.ts'
import LogoMark from './LogoMark.tsx'

const fxBases = ['USD', 'EUR', 'GBP', 'CHF'] as const
const RIBBON_KEY = 'aure-request-ribbon'

type FxQuote = { base: string; quote: string; rate: number }

function readRibbonOpen() {
  try {
    return sessionStorage.getItem(RIBBON_KEY) !== 'closed'
  } catch {
    return true
  }
}

export default function SiteHeader({
  active,
  onRequest,
}: {
  active?: 'partners' | 'compare' | 'calc' | 'support' | 'blog'
  onRequest: () => void
}) {
  const { t, locale } = useI18n()
  const [menu, setMenu] = useState(false)
  const [ribbonOpen, setRibbonOpen] = useState(readRibbonOpen)
  const [fx, setFx] = useState<FxQuote[]>([])
  const [gold, setGold] = useState(0)
  const howHref = active ? withBase('#how') : '#how'
  const plansHref = active ? withBase('#plans') : '#plans'

  useEffect(() => {
    let cancelled = false
    async function loadQuotes() {
      const [ratesRes, goldRes] = await Promise.all([apiFetch('/api/rates'), apiFetch('/api/gold')])
      const rates = await readApiJson<{ quotes?: FxQuote[] }>(ratesRes)
      const metal = await readApiJson<{ gramTry?: number; source?: string }>(goldRes)
      if (cancelled) return
      if (ratesRes?.ok && rates?.quotes?.length) setFx(rates.quotes)
      if (goldRes?.ok && metal?.source === 'collectapi' && metal.gramTry) setGold(metal.gramTry)
    }
    void loadQuotes()
    return () => {
      cancelled = true
    }
  }, [])

  const quotes = fxBases.map((base) => fx.find((row) => row.base === base) ?? { base, quote: 'TRY', rate: 0 })

  function closeRibbon() {
    try {
      sessionStorage.setItem(RIBBON_KEY, 'closed')
    } catch {
      /* storage can be unavailable */
    }
    setRibbonOpen(false)
  }

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <a className="logo" href={active ? withBase() : '#top'}>
          <LogoMark />
          AURE
        </a>
        <nav className="nav-links">
          <a href={howHref}>{t.nav.how}</a>
          <a href={plansHref}>{t.nav.plans}</a>
          <a href={withBase('karsilastir')} aria-current={active === 'compare' ? 'page' : undefined}>
            {t.nav.compare}
          </a>
          <a href={withBase('hesaplama')} aria-current={active === 'calc' ? 'page' : undefined}>
            {t.nav.calc}
          </a>
          <a href={withBase('isbirlikleri')} aria-current={active === 'partners' ? 'page' : undefined}>
            {t.nav.partners}
          </a>
          <a href={withBase('support')} aria-current={active === 'support' ? 'page' : undefined}>
            {t.nav.support}
          </a>
          <a className="nav-blog" href={withBase('blog')} aria-current={active === 'blog' ? 'page' : undefined}>
            {t.nav.blog}
            <span className="nav-new">{t.nav.newPage}</span>
          </a>
        </nav>
        <div className="nav-cta">
          <LangSwitch />
          <button className="menu-btn" aria-label={t.nav.menu} onClick={() => setMenu((v) => !v)}>
            ☰
          </button>
        </div>
      </div>
      {ribbonOpen && (
        <div className="nav-ribbon">
          <div className="nav-ribbon-sheen" aria-hidden="true" />
          <div className="wrap nav-ribbon-inner">
            <p className="nav-ribbon-copy">
              <span className="nav-ribbon-pulse" aria-hidden="true" />
              <strong>{t.nav.ribbonTitle}</strong>
              <em>{t.nav.ribbonNote}</em>
            </p>
            <div className="nav-ribbon-actions">
              <button type="button" className="nav-ribbon-btn" onClick={onRequest}>
                {t.nav.request}
              </button>
              <button type="button" className="nav-ribbon-close" aria-label={t.nav.ribbonClose} onClick={closeRibbon}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 3 L11 11 M11 3 L3 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="nav-rates-bar">
        <div className="wrap nav-rates" aria-label={t.fx.eyebrow}>
          <span className="dot" aria-hidden="true" />
          {quotes.map((row) => (
            <span className="nav-rate" key={row.base}>
              <span>{row.base}</span>
              <strong>{row.rate ? formatFx(row.rate, locale) : '—'}</strong>
            </span>
          ))}
          <span className="nav-rate" title={t.fx.goldHint}>
            <span>{t.fx.gold}</span>
            <strong>{gold ? formatGram(gold, locale) : '—'}</strong>
          </span>
        </div>
      </div>
      <div className={`wrap mobile-drawer ${menu ? 'open' : ''}`}>
        <a href={howHref} onClick={() => setMenu(false)}>
          {t.nav.how}
        </a>
        <a href={plansHref} onClick={() => setMenu(false)}>
          {t.nav.plans}
        </a>
        <a href={withBase('karsilastir')} onClick={() => setMenu(false)} aria-current={active === 'compare' ? 'page' : undefined}>
          {t.nav.compare}
        </a>
        <a href={withBase('hesaplama')} onClick={() => setMenu(false)} aria-current={active === 'calc' ? 'page' : undefined}>
          {t.nav.calc}
        </a>
        <a href={withBase('isbirlikleri')} onClick={() => setMenu(false)} aria-current={active === 'partners' ? 'page' : undefined}>
          {t.nav.partners}
        </a>
        <a href={withBase('support')} onClick={() => setMenu(false)} aria-current={active === 'support' ? 'page' : undefined}>
          {t.nav.support}
        </a>
        <a className="nav-blog" href={withBase('blog')} onClick={() => setMenu(false)} aria-current={active === 'blog' ? 'page' : undefined}>
          {t.nav.blog}
          <span className="nav-new">{t.nav.newPage}</span>
        </a>
        <button
          type="button"
          className="linkish"
          onClick={() => {
            setMenu(false)
            onRequest()
          }}
        >
          {t.nav.request}
        </button>
      </div>
    </header>
  )
}
