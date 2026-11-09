import { useMemo, useState } from 'react'
import { useI18n } from './i18n/LocaleContext.tsx'
import { formatDelta, formatEur, formatMoney } from './i18n/format.ts'
import {
  FX_MAX,
  FX_MIN,
  FX_SELL_MAX,
  FX_SELL_MIN,
  FX_SELL_STEP,
  FX_STEP,
  IDLE_MIN,
  IDLE_STEP,
  SAMPLE_EUR_SELL,
  SAMPLE_EUR_TRY,
  SAMPLE_IDLE_TRY,
  SPEND_MAX,
  SPEND_MIN,
  SPEND_STEP,
  minimumScenario,
  planBreakdown,
  plans,
  type PlanColumnId,
} from './plans.ts'
import type { PlanId } from './waitlist'

export default function Simulator({
  cycleYearly,
  focus,
  onFocus,
  onPick,
  eurTry,
}: {
  cycleYearly: boolean
  focus: { id: PlanId; tick: number } | null
  onFocus: (id: PlanId) => void
  onPick: (id: PlanId) => void
  eurTry: number
}) {
  const { t, locale } = useI18n()
  const [fx, setFx] = useState(0)
  const [fxSell, setFxSell] = useState(0)
  const [manual, setManual] = useState<{ spend: number; idle: number; tick: number | null } | null>(null)
  const focused = focus ? plans.find((item) => item.id === focus.id) : undefined
  const preset = focus && focused && manual?.tick !== focus.tick ? minimumScenario(focused, cycleYearly) : null
  const spend = preset?.spend ?? manual?.spend ?? 18_000
  const idle = preset?.idle ?? manual?.idle ?? 40_000
  const market = eurTry > 0 ? eurTry : SAMPLE_EUR_TRY

  function choose(nextSpend: number, nextIdle: number) {
    setManual({ spend: nextSpend, idle: nextIdle, tick: focus?.tick ?? null })
  }

  const rows = useMemo(() => {
    return plans.map((plan) => {
      const monthly = planBreakdown(plan, spend, idle, cycleYearly, fx, market, fxSell)
      return { id: plan.id, name: plan.name, ...monthly }
    })
  }, [spend, idle, cycleYearly, fx, market, fxSell])

  const bestId = rows.reduce((best, row) => (row.net > best.net ? row : best), rows[0]).id
  const colName: Record<PlanColumnId, string> = {
    account: t.pkg.account,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }

  return (
    <div className="simulator" id="simulator">
      <div className="simulator-controls">
        <label className="sim-spend-label" htmlFor="sim-spend">
          {t.simulator.spend}
        </label>
        <label className="sim-idle-label" htmlFor="sim-idle">
          {t.simulator.idle}
        </label>
        <label className="sim-fx-label" htmlFor="sim-fx">
          {t.simulator.fx}
        </label>
        <label className="sim-sell-label" htmlFor="sim-fx-sell">
          {t.simulator.fxSell}
        </label>
        <strong className="sim-spend-value">{formatMoney(spend, locale)}</strong>
        <strong className="sim-idle-value">{formatMoney(idle, locale)}</strong>
        <strong className="sim-fx-value">{formatMoney(fx, locale)}</strong>
        <strong className="sim-sell-value">{formatEur(fxSell, locale)}</strong>
        <input
          id="sim-spend"
          className="sim-spend-range"
          type="range"
          min={SPEND_MIN}
          max={SPEND_MAX}
          step={SPEND_STEP}
          value={spend}
          onChange={(e) => choose(Number(e.target.value), idle)}
        />
        <input
          id="sim-idle"
          className="sim-idle-range"
          type="range"
          min={IDLE_MIN}
          max={SAMPLE_IDLE_TRY}
          step={IDLE_STEP}
          value={idle}
          onChange={(e) => choose(spend, Number(e.target.value))}
        />
        <input
          id="sim-fx"
          className="sim-fx-range"
          type="range"
          min={FX_MIN}
          max={FX_MAX}
          step={FX_STEP}
          value={fx}
          onChange={(e) => setFx(Number(e.target.value))}
        />
        <input
          id="sim-fx-sell"
          className="sim-sell-range"
          type="range"
          min={FX_SELL_MIN}
          max={FX_SELL_MAX}
          step={FX_SELL_STEP}
          value={fxSell}
          onChange={(e) => setFxSell(Number(e.target.value))}
        />
        <button type="button" className="simulator-preset" onClick={() => choose(spend, SAMPLE_IDLE_TRY)}>
          {t.simulator.idlePreset}
        </button>
        <button type="button" className="simulator-sell-preset" onClick={() => setFxSell(SAMPLE_EUR_SELL)}>
          {t.simulator.fxSellPreset}
        </button>
      </div>
      {focus && (
        <p className="simulator-minimum">
          {t.simulator.minimum.replace('{plan}', colName[focus.id])}
        </p>
      )}
      <div className="simulator-grid">
        {rows.map((row) => (
          <article
            key={row.id}
            className={`simulator-card ${row.id === bestId ? 'best' : ''} ${focus?.id === row.id ? 'picked' : ''}`}
            onClick={() => onFocus(row.id)}
          >
            <div className="simulator-kicker">
              <h3>{colName[row.id]}</h3>
              {row.id === bestId && <b>{t.simulator.best}</b>}
            </div>
            <dl>
              <div>
                <dt>{t.simulator.fee}</dt>
                <dd>{formatMoney(row.fee, locale)}</dd>
              </div>
              <div>
                <dt>{t.simulator.interest}</dt>
                <dd>{formatDelta(row.interest, locale)}</dd>
              </div>
              <div>
                <dt>{t.simulator.extras}</dt>
                <dd>{formatMoney(row.extras, locale)}</dd>
              </div>
              <div>
                <dt>{t.simulator.fxGain}</dt>
                <dd>{formatDelta(row.fx, locale)}</dd>
              </div>
              <div>
                <dt>{t.simulator.fxSellGain}</dt>
                <dd>{formatDelta(row.fxSell, locale)}</dd>
              </div>
            </dl>
            <p className="simulator-net">
              <span>{t.simulator.net}</span>
              <strong>
                {formatDelta(row.net, locale)}
                <small>{t.simulator.perMonth}</small>
              </strong>
            </p>
            <button
              type="button"
              className="btn btn-solid"
              onClick={(event) => {
                event.stopPropagation()
                onPick(row.id)
              }}
            >
              {t.simulator.pick}
            </button>
          </article>
        ))}
      </div>
      <p className="simulator-sample">{t.simulator.sample}</p>
    </div>
  )
}
