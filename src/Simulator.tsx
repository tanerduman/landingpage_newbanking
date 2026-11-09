import { useMemo, useState } from 'react'
import { useI18n } from './i18n/LocaleContext.tsx'
import { formatMoney } from './i18n/format.ts'
import { SAMPLE_IDLE_TRY, plans, type PlanColumnId } from './plans.ts'
import type { PlanId } from './waitlist'

function estimate(plan: (typeof plans)[number], spend: number, idle: number) {
  const waived = spend >= plan.waiverSpend
  const fee = waived ? 0 : plan.monthly
  const interest = (idle * plan.overnight) / 12
  const extras = spend * 0.4 * plan.campaignRate + spend * 0.2 * plan.installmentRate
  return { waived, fee, interest, extras, net: interest + extras - fee }
}

export default function Simulator({
  cycleYearly,
  onPick,
}: {
  cycleYearly: boolean
  onPick: (id: PlanId) => void
}) {
  const { t, locale } = useI18n()
  const [spend, setSpend] = useState(18_000)
  const [idle, setIdle] = useState(40_000)

  const rows = useMemo(() => {
    return plans.map((plan) => {
      const monthly = estimate(plan, spend, idle)
      if (!cycleYearly) return { id: plan.id, name: plan.name, ...monthly }
      const yearlyFee = monthly.waived ? 0 : plan.monthly * 10
      return {
        id: plan.id,
        name: plan.name,
        waived: monthly.waived,
        fee: yearlyFee / 12,
        interest: monthly.interest,
        extras: monthly.extras,
        net: monthly.interest + monthly.extras - yearlyFee / 12,
      }
    })
  }, [spend, idle, cycleYearly])

  const bestId = rows.reduce((best, row) => (row.net > best.net ? row : best), rows[0]).id
  const colName: Record<PlanColumnId, string> = {
    account: t.pkg.account,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }

  return (
    <div className="simulator" id="simulator">
      <p className="simulator-note">{t.plans.waiverNote}</p>
      <div className="simulator-controls">
        <label>
          <span>{t.simulator.spend}</span>
          <strong>{formatMoney(spend, locale)}</strong>
          <input
            type="range"
            min={5000}
            max={80000}
            step={1000}
            value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
          />
        </label>
        <label>
          <span>{t.simulator.idle}</span>
          <strong>{formatMoney(idle, locale)}</strong>
          <input
            type="range"
            min={5000}
            max={SAMPLE_IDLE_TRY}
            step={5000}
            value={idle}
            onChange={(e) => setIdle(Number(e.target.value))}
          />
          <button type="button" className="simulator-preset" onClick={() => setIdle(SAMPLE_IDLE_TRY)}>
            {t.simulator.idlePreset}
          </button>
        </label>
      </div>
      <div className="simulator-grid">
        {rows.map((row) => (
          <article key={row.id} className={`simulator-card ${row.id === bestId ? 'best' : ''}`}>
            <div className="simulator-kicker">
              <h3>{colName[row.id]}</h3>
              {row.id === bestId && <b>{t.simulator.best}</b>}
            </div>
            <dl>
              <div>
                <dt>{t.simulator.fee}</dt>
                <dd className={row.waived ? 'waived' : ''}>{row.waived ? t.simulator.waived : formatMoney(row.fee, locale)}</dd>
              </div>
              <div>
                <dt>{t.simulator.interest}</dt>
                <dd>{formatMoney(row.interest, locale)}</dd>
              </div>
              <div>
                <dt>{t.simulator.extras}</dt>
                <dd>{formatMoney(row.extras, locale)}</dd>
              </div>
            </dl>
            <p className="simulator-net">
              <span>{t.simulator.net}</span>
              <strong>
                {formatMoney(row.net, locale)}
                <small>{t.simulator.perMonth}</small>
              </strong>
            </p>
            <button type="button" className="btn btn-solid" onClick={() => onPick(row.id)}>
              {t.simulator.pick}
            </button>
          </article>
        ))}
      </div>
      <p className="simulator-sample">{t.simulator.sample}</p>
    </div>
  )
}
