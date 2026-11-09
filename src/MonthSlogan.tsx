import { useI18n } from './i18n/LocaleContext.tsx'
import { formatDelta, formatMoney } from './i18n/format.ts'
import { ACCOUNT_OVERNIGHT, SAMPLE_IDLE_TRY, plans } from './plans.ts'

function premiumYearFromMonth() {
  const premium = plans.find((plan) => plan.id === 'premium')
  const rate = premium?.overnight ?? 0
  const yearly = (premium?.monthly ?? 0) * 10
  const interest = (SAMPLE_IDLE_TRY * (rate - ACCOUNT_OVERNIGHT)) / 12
  const times = interest > 0 ? Math.max(1, Math.round(yearly / interest)) : 1
  return { interest, yearly, times, rate: Math.round(rate * 100) }
}

export default function MonthSlogan() {
  const { t, locale } = useI18n()
  const copy = t.monthSlogan
  const { interest, yearly, times, rate } = premiumYearFromMonth()
  const balance = formatMoney(SAMPLE_IDLE_TRY, locale)
  const interestLabel = formatDelta(interest, locale)
  const yearlyLabel = formatMoney(yearly, locale)
  const fine = copy.fine.replace('{rate}', String(rate)).replace('{times}', String(times))

  return (
    <section className="month-slogan" aria-label={copy.aria}>
      <div className="month-phone" aria-hidden="true">
        <div className="month-screen">
          <div className="month-status">
            <span>9:41</span>
            <span>AURE</span>
          </div>
          <h3>{copy.home}</h3>
          <p className="month-pill">{copy.active}</p>
          <p className="month-balance">
            <span>{copy.idle}</span>
            <strong>{balance}</strong>
          </p>
          <article className="month-card">
            <em>{copy.sample}</em>
            <p>
              {copy.lineA}
              <b>{copy.lineB}</b>
            </p>
            <div className="month-eq">
              <div>
                <small>{copy.interest}</small>
                <strong>{interestLabel}</strong>
              </div>
              <span aria-hidden="true">→</span>
              <div>
                <small>{copy.yearly}</small>
                <strong>{yearlyLabel}</strong>
              </div>
            </div>
            <p className="month-fine">{fine}</p>
          </article>
          <div className="month-wallet">
            <div>
              <b>{copy.currency}</b>
              <span>{copy.currencyName}</span>
            </div>
            <b>{balance}</b>
          </div>
          <div className="month-nav">
            <span>{copy.navHome}</span>
            <span>{copy.navCard}</span>
            <span>{copy.navFx}</span>
            <span>{copy.navMore}</span>
          </div>
        </div>
      </div>
      <div className="month-band">
        <div>
          <span className="month-kicker">{copy.days}</span>
          <strong>{balance}</strong>
        </div>
        <p>
          {copy.lineA} <b>{copy.lineB}</b>
        </p>
        <div className="month-proof">
          <span className="month-kicker">{copy.proof}</span>
          <strong>
            {interestLabel} <i>→</i> {yearlyLabel}
          </strong>
          <span>{copy.proofHint}</span>
        </div>
        <p className="month-note">{fine}</p>
      </div>
    </section>
  )
}
