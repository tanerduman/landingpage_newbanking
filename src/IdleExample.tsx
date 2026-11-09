import { useMemo } from 'react'
import { useI18n } from './i18n/LocaleContext.tsx'
import { formatDelta, formatEur, formatFx, formatMoney, formatRate } from './i18n/format.ts'
import {
  SAMPLE_IDLE_TRY,
  fxFeeByColumn,
  monthlyFeeOf,
  overnightByColumn,
  planColumns,
  type PlanColumnId,
} from './plans.ts'
import type { PlanId } from './waitlist'

function isPlanId(id: PlanColumnId): id is PlanId {
  return id !== 'account'
}

export default function IdleExample({ onPick, eurTry }: { onPick: (id: PlanId) => void; eurTry: number }) {
  const { t, locale } = useI18n()
  const idle = SAMPLE_IDLE_TRY
  const market = eurTry > 0 ? eurTry : 0

  const rows = useMemo(() => {
    const baseInterest = (idle * overnightByColumn.account) / 12
    const baseEur = market ? idle / (market * (1 + fxFeeByColumn.account)) : 0
    return planColumns.map((col) => {
      const interest = (idle * overnightByColumn[col.id]) / 12
      const extraInterest = interest - baseInterest
      const fee = monthlyFeeOf(col.id)
      const net = col.id === 'account' ? interest - fee : extraInterest - fee
      const eur = market ? idle / (market * (1 + fxFeeByColumn[col.id])) : 0
      return {
        id: col.id,
        interest,
        extraInterest,
        fee,
        net,
        extra: col.id === 'account' ? 0 : net,
        eur,
        eurExtra: eur - baseEur,
        tryExtra: (eur - baseEur) * market,
        fxFee: fxFeeByColumn[col.id],
        overnight: overnightByColumn[col.id],
      }
    })
  }, [idle, market])

  const premium = rows.find((row) => row.id === 'premium') ?? rows[rows.length - 1]
  const colName: Record<PlanColumnId, string> = {
    account: t.pkg.account,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }

  return (
    <div className="idle-example">
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span className="dot" /> {t.idleExample.kicker}
          </div>
          <h2>{t.idleExample.title}</h2>
        </div>
        <p>{t.idleExample.lead}</p>
      </div>

      <div className="idle-board">
        <header className="idle-board-head">
          <span>{t.idleExample.boardTitle}</span>
          <strong>{formatMoney(idle, locale)}</strong>
          <p>{t.idleExample.amountHint}</p>
        </header>

        <p className="idle-label">{t.idleExample.overnight}</p>
        <div className="idle-grid">
          {rows.map((row) => (
            <article key={row.id} className={`idle-card ${row.id === 'premium' ? 'featured' : ''} ${row.id === 'account' ? 'base' : ''}`}>
              <div className="idle-card-kicker">
                <h3>{colName[row.id]}</h3>
                {row.id === 'premium' && <b>{t.simulator.best}</b>}
              </div>
              <dl>
                <div>
                  <dt>{t.idleExample.rate}</dt>
                  <dd>{formatRate(row.overnight, locale)}</dd>
                </div>
                <div>
                  <dt>{row.id === 'account' ? t.idleExample.overnight : t.simulator.interest}</dt>
                  <dd>
                    {row.id === 'account'
                      ? formatMoney(row.interest, locale)
                      : formatDelta(row.extraInterest, locale)}
                  </dd>
                </div>
                <div>
                  <dt>{t.idleExample.fee}</dt>
                  <dd>{row.fee === 0 ? t.pkg.free : formatMoney(row.fee, locale)}</dd>
                </div>
              </dl>
              <p className="idle-net">
                <span>{row.id === 'account' ? t.idleExample.net : t.idleExample.vsBase}</span>
                <strong>
                  {row.id === 'account' ? formatMoney(row.net, locale) : formatDelta(row.net, locale)}
                  <small>{t.simulator.perMonth}</small>
                </strong>
              </p>
              {row.id === 'account' ? (
                <p className="idle-stay">{t.idleExample.stay}</p>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-solid"
                    onClick={() => {
                      if (isPlanId(row.id)) onPick(row.id)
                    }}
                  >
                    {t.idleExample.pick}
                  </button>
                </>
              )}
            </article>
          ))}
        </div>

        <p className="idle-label">{t.idleExample.fx}</p>
        <p className="idle-fx-hint">
          {market ? t.idleExample.fxHint.replace('{rate}', formatFx(market, locale)) : t.idleExample.fxHintWait}
        </p>
        <div className="idle-grid idle-fx">
          {rows.map((row) => (
            <article key={`fx-${row.id}`} className={`idle-card ${row.id === 'premium' ? 'featured' : ''} ${row.id === 'account' ? 'base' : ''}`}>
              <h3>{colName[row.id]}</h3>
              <dl>
                <div>
                  <dt>{t.idleExample.spread}</dt>
                  <dd className={row.fxFee === 0 ? 'zero' : row.id === 'account' ? 'spread' : ''}>
                    {formatRate(row.fxFee, locale)}
                  </dd>
                </div>
              </dl>
              <p className="idle-net">
                <span>{t.idleExample.eur}</span>
                <strong>{market ? formatEur(row.eur, locale) : '—'}</strong>
              </p>
              {market > 0 && row.id !== 'account' && (
                <p className="idle-delta">
                  +{formatEur(row.eurExtra, locale)} · +{formatMoney(row.tryExtra, locale)} {t.idleExample.more}
                </p>
              )}
            </article>
          ))}
        </div>

        <p className="idle-foot">
          <span aria-hidden="true">✓</span>
          {t.idleExample.footStart} {formatDelta(premium.extra, locale)} {t.idleExample.footNet}
          {market > 0 && (
            <>
              {' '}
              {t.idleExample.footMid} {formatMoney(premium.tryExtra, locale)} {t.idleExample.footEnd}
            </>
          )}
        </p>
        <p className="idle-sample">{t.idleExample.sample}</p>
      </div>
    </div>
  )
}
