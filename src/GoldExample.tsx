import { useMemo } from 'react'
import { useI18n } from './i18n/LocaleContext.tsx'
import { formatRate, formatTry } from './i18n/format.ts'
import {
  SAMPLE_GOLD_GRAMS,
  SAMPLE_GOLD_TEMEL_TRY,
  SAMPLE_GOLD_TRY,
  goldSpreadByColumn,
  planColumns,
  type PlanColumnId,
} from './plans.ts'
import type { PlanId } from './waitlist'

function isPlanId(id: PlanColumnId): id is PlanId {
  return id !== 'account'
}

export default function GoldExample({ onPick }: { onPick: (id: PlanId) => void }) {
  const { t, locale } = useI18n()
  const grams = SAMPLE_GOLD_GRAMS
  const mid = SAMPLE_GOLD_TRY

  const rows = useMemo(() => {
    const temelPay = SAMPLE_GOLD_TEMEL_TRY * grams
    return planColumns.map((col) => {
      const spread = goldSpreadByColumn[col.id]
      const gram =
        col.id === 'account' ? SAMPLE_GOLD_TEMEL_TRY : Math.round(mid * (1 + spread) * 100) / 100
      const pay = Math.round(gram * grams * 100) / 100
      return {
        id: col.id,
        spread,
        gram,
        pay,
        saved: Math.round((temelPay - pay) * 100) / 100,
      }
    })
  }, [grams, mid])

  const premium = rows.find((row) => row.id === 'premium') ?? rows[rows.length - 1]
  const colName: Record<PlanColumnId, string> = {
    account: t.pkg.account,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }

  return (
    <div className="idle-example gold-example">
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span className="dot" /> {t.goldExample.kicker}
          </div>
          <h2>{t.goldExample.title}</h2>
        </div>
        <p>{t.goldExample.lead}</p>
      </div>

      <div className="idle-board">
        <header className="idle-board-head">
          <span>{t.goldExample.boardTitle}</span>
          <strong>{t.goldExample.amount}</strong>
          <p>{t.goldExample.amountHint.replace('{price}', formatTry(mid, locale))}</p>
        </header>

        <div className="idle-grid">
          {rows.map((row) => (
            <article
              key={row.id}
              className={`idle-card ${row.id === 'premium' ? 'featured' : ''} ${row.id === 'account' ? 'base' : ''}`}
            >
              <div className="idle-card-kicker">
                <h3>{colName[row.id]}</h3>
                {row.id === 'premium' && <b>{t.simulator.best}</b>}
              </div>
              <dl>
                <div>
                  <dt>{t.goldExample.spread}</dt>
                  <dd className={row.spread === 0 ? 'zero' : row.id === 'account' ? 'spread' : ''}>
                    {formatRate(row.spread, locale)}
                  </dd>
                </div>
                <div>
                  <dt>{t.goldExample.gram}</dt>
                  <dd>{formatTry(row.gram, locale)}</dd>
                </div>
              </dl>
              <p className="idle-net">
                <span>{t.goldExample.pay}</span>
                <strong>{formatTry(row.pay, locale)}</strong>
              </p>
              {row.id === 'account' ? (
                <p className="idle-stay">{t.goldExample.stay}</p>
              ) : (
                <>
                  <p className="idle-delta">
                    −{formatTry(row.saved, locale)} {t.goldExample.less}
                  </p>
                  <button
                    type="button"
                    className="btn btn-solid"
                    onClick={() => {
                      if (isPlanId(row.id)) onPick(row.id)
                    }}
                  >
                    {t.goldExample.pick}
                  </button>
                </>
              )}
            </article>
          ))}
        </div>

        <p className="idle-foot">
          <span aria-hidden="true">✓</span>
          {t.goldExample.footStart} {formatTry(premium.saved, locale)} {t.goldExample.footMid}
        </p>
        <p className="idle-sample">{t.goldExample.sample}</p>
      </div>
    </div>
  )
}
