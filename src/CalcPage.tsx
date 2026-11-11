import { useEffect, useMemo, useState } from 'react'
import { apiFetch, readApiJson } from './api.ts'
import SiteHeader from './SiteHeader.tsx'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { formatEur, formatFx, formatRate, formatTry } from './i18n/format.ts'
import {
  CALC_EUR_BUY,
  SAMPLE_EUR_TRY,
  SAMPLE_GOLD_GRAMS,
  SAMPLE_GOLD_TRY,
  fxFeeByColumn,
  fxLimitEurByColumn,
  goldSpreadByColumn,
  planColumns,
  tryCostForEur,
  type PlanColumnId,
} from './plans.ts'

type Quote = { base: string; rate: number }

function spreadBands(id: PlanColumnId, eur: number, locale: 'tr' | 'en', allAt: string, split: string) {
  const fee = fxFeeByColumn[id]
  const cap = fxLimitEurByColumn[id]
  const rate = formatRate(fee, locale)
  if (cap == null || eur <= cap) return allAt.replace('{rate}', rate)
  return split
    .replace('{cap}', formatEur(cap, locale))
    .replace('{rate}', rate)
    .replace('{rest}', formatEur(eur - cap, locale))
    .replace('{over}', formatRate(fxFeeByColumn.account, locale))
}

export default function CalcPage() {
  const { t, locale } = useI18n()
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [gold, setGold] = useState(SAMPLE_GOLD_TRY)
  const [goldLive, setGoldLive] = useState(false)
  const [eurTry, setEurTry] = useState(SAMPLE_EUR_TRY)
  const [eurLive, setEurLive] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [goldRes, ratesRes] = await Promise.all([apiFetch('/api/gold'), apiFetch('/api/rates')])
      const metal = await readApiJson<{ gramTry?: number; source?: string }>(goldRes)
      const rates = await readApiJson<{ quotes?: Quote[] }>(ratesRes)
      if (cancelled) return
      if (goldRes?.ok && metal?.source === 'collectapi' && metal.gramTry) {
        setGold(metal.gramTry)
        setGoldLive(true)
      }
      const eur = rates?.quotes?.find((row) => row.base === 'EUR')
      if (ratesRes?.ok && eur?.rate) {
        setEurTry(eur.rate)
        setEurLive(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const names: Record<PlanColumnId, string> = {
    account: t.plans.basicName,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }

  const goldRows = useMemo(() => {
    const priced = planColumns.map((col) => {
      const spread = goldSpreadByColumn[col.id]
      const gram = Math.round(gold * (1 + spread) * 100) / 100
      const pay = Math.round(gram * SAMPLE_GOLD_GRAMS * 100) / 100
      return { id: col.id, spread, gram, pay }
    })
    const base = priced.find((row) => row.id === 'account')?.pay ?? 0
    return priced.map((row) => ({ ...row, saved: Math.round((base - row.pay) * 100) / 100 }))
  }, [gold])

  const fxRows = useMemo(() => {
    const priced = planColumns.map((col) => {
      const pay = Math.round(tryCostForEur(col.id, CALC_EUR_BUY, eurTry) * 100) / 100
      const bands = spreadBands(col.id, CALC_EUR_BUY, locale, t.calc.allAt, t.calc.split)
      return { id: col.id, pay, bands }
    })
    const base = priced.find((row) => row.id === 'account')?.pay ?? 0
    return priced.map((row) => ({ ...row, saved: Math.round((base - row.pay) * 100) / 100 }))
  }, [eurTry, locale, t.calc.allAt, t.calc.split])

  const goldNote = (goldLive ? t.calc.goldHint : t.calc.goldHintWait).replace('{price}', formatTry(gold, locale))
  const fxNote = (eurLive ? t.calc.fxHint : t.calc.fxHintWait).replace('{rate}', formatFx(eurTry, locale))

  return (
    <div className="page">
      <SiteHeader active="calc" onRequest={() => setModal(true)} />
      <main className="wrap calc-main">
        <p className="hero-kicker">
          <span className="dot" /> {t.calc.kicker}
        </p>
        <h1>{t.calc.title}</h1>
        <p className="calc-lead">{t.calc.lead}</p>

        <section className="calc-block">
          <div className="idle-board">
            <header className="idle-board-head">
              <span>{t.calc.goldTitle}</span>
              <strong>10 g</strong>
              <p>{goldNote}</p>
            </header>
            <div className="idle-grid">
              {goldRows.map((row) => (
                <article key={row.id} className="idle-card">
                  <h3>{names[row.id]}</h3>
                  <dl>
                    <div>
                      <dt>{t.calc.spread}</dt>
                      <dd>{formatRate(row.spread, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t.calc.gram}</dt>
                      <dd>{formatTry(row.gram, locale)}</dd>
                    </div>
                  </dl>
                  <p className="idle-net">
                    <span>{t.calc.pay}</span>
                    <strong>{formatTry(row.pay, locale)}</strong>
                  </p>
                  <p className={row.id === 'account' ? 'idle-stay' : 'idle-delta'}>
                    {row.id === 'account' ? t.calc.same : `−${formatTry(row.saved, locale)} ${t.calc.less}`}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="calc-block">
          <div className="idle-board">
            <header className="idle-board-head">
              <span>{t.calc.fxTitle}</span>
              <strong>{formatEur(CALC_EUR_BUY, locale)}</strong>
              <p>{fxNote}</p>
            </header>
            <div className="idle-grid">
              {fxRows.map((row) => (
                <article key={row.id} className="idle-card">
                  <h3>{names[row.id]}</h3>
                  <dl>
                    <div className="calc-band-row">
                      <dt>{t.calc.bands}</dt>
                      <dd className="calc-bands">{row.bands}</dd>
                    </div>
                  </dl>
                  <p className="idle-net">
                    <span>{t.calc.pay}</span>
                    <strong>{formatTry(row.pay, locale)}</strong>
                  </p>
                  <p className={row.id === 'account' ? 'idle-stay' : 'idle-delta'}>
                    {row.id === 'account' ? t.calc.same : `−${formatTry(row.saved, locale)} ${t.calc.less}`}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer>
        <div className="wrap foot">
          <span>{t.footer.legal}</span>
        </div>
      </footer>
      {modal && (
        <SignupModal
          intent="account"
          cycle="none"
          onClose={(msg) => {
            setModal(false)
            if (msg) setToast(msg)
          }}
        />
      )}
      {toast && <SignupToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
