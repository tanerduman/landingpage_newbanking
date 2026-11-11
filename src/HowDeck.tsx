import { useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'
import LogoMark from './LogoMark.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'

const SLIDES = 6

const CARDS = [
  { id: 'premium', label: 'AURE Premium', pan: '•••• 1904' },
  { id: 'plus', label: 'AURE Plus', pan: '•••• 8821' },
  { id: 'standard', label: 'AURE Standard', pan: '•••• 4412' },
  { id: 'account', label: '', pan: '•••• 2208' },
] as const

function Brand() {
  return (
    <span className="how-brand">
      <LogoMark className="how-brand-mark" />
      AURE
    </span>
  )
}

export default function HowDeck() {
  const { t, locale } = useI18n()
  const tr = locale === 'tr'
  const [index, setIndex] = useState(0)
  const startX = useRef<number | null>(null)
  const names = {
    account: t.plans.basicName,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }
  const pct = (value: string) => (tr ? `%${value}` : `${value}%`)
  const step = (value: string) => t.how.nightStep.replace('{n}', `+${value}`)

  function go(next: number) {
    setIndex(Math.min(SLIDES - 1, Math.max(0, next)))
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(index + 1)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(index - 1)
    }
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    startX.current = event.clientX
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    if (startX.current == null) return
    const dx = event.clientX - startX.current
    startX.current = null
    if (dx <= -48) go(index + 1)
    if (dx >= 48) go(index - 1)
  }

  const position = t.how.position.replace('{n}', String(index + 1).padStart(2, '0')).replace('{total}', String(SLIDES).padStart(2, '0'))

  return (
    <section
      className="how-deck"
      aria-roledescription="carousel"
      aria-label={t.how.deckLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div className="how-deck-top">
        <span className="how-deck-count">
          <span className="dot" />
          {position}
        </span>
        <span className="how-deck-nav">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0}>
            {t.how.prev}
          </button>
          <button type="button" onClick={() => go(index + 1)} disabled={index === SLIDES - 1}>
            {t.how.next}
          </button>
        </span>
      </div>
      <div className="how-split">
        <div className="how-fan" aria-hidden="true">
          {CARDS.map((card) => (
            <article key={card.id} className={`how-bank how-bank-${card.id}`}>
              <div className="how-bank-top">
                <span className="how-chip" />
                <Brand />
              </div>
              <div>
                <small>{card.id === 'account' ? t.hero.cardAccount : card.label}</small>
                <b>{card.pan}</b>
              </div>
            </article>
          ))}
        </div>
        <div className="how-slide" aria-live="polite">
          {index === 0 && (
            <>
              <h3>{t.how.stackTitle}</h3>
              <p>{t.how.stackLead}</p>
              <div className="how-layers">
                {(['premium', 'plus', 'standard'] as const).map((id) => (
                  <div key={id} className="how-layer">
                    <strong>{names[id]}</strong>
                    <span>{t.how.layerNote}</span>
                  </div>
                ))}
                <div className="how-layer how-layer-base">
                  <strong>{names.account}</strong>
                  <span>{t.how.layerBase}</span>
                </div>
              </div>
            </>
          )}
          {index === 1 && (
            <>
              <h3>{t.how.spreadTitle}</h3>
              <p>{t.how.spreadLead}</p>
              <div className="how-bars">
                {(
                  [
                    ['account', '4', '100%'],
                    ['standard', '2', '50%'],
                    ['plus', '1', '25%'],
                    ['premium', tr ? '0,5' : '0.5', '12.5%'],
                  ] as const
                ).map(([id, rate, width]) => (
                  <div key={id} className="how-bar">
                    <b>{names[id]}</b>
                    <span className="how-track">
                      <span className="how-fill" style={{ width }} />
                    </span>
                    <strong>{pct(rate)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
          {index === 2 && (
            <>
              <h3>{t.how.capTitle}</h3>
              <p>{t.how.capLead}</p>
              <div className="how-caps">
                {(
                  [
                    ['standard', tr ? '1.500 €' : '1,500 €', '5 g'],
                    ['plus', tr ? '5.000 €' : '5,000 €', '10 g'],
                    ['premium', tr ? '10.000 €' : '10,000 €', '15 g'],
                  ] as const
                ).map(([id, eur, gold]) => (
                  <article key={id} className="how-cap">
                    <em>{names[id]}</em>
                    <strong>{eur}</strong>
                    <small>{t.how.capFx}</small>
                    <div>
                      <strong>{gold}</strong>
                      <small>{t.how.capGold}</small>
                    </div>
                  </article>
                ))}
              </div>
              <p className="how-floor">{t.how.capFloor}</p>
            </>
          )}
          {index === 3 && (
            <>
              <h3>{t.how.nightTitle}</h3>
              <p>{t.how.nightLead}</p>
              <div className="how-rates">
                {(
                  [
                    ['account', '34', ''],
                    ['standard', tr ? '34,5' : '34.5', tr ? '0,5' : '0.5'],
                    ['plus', tr ? '34,75' : '34.75', tr ? '0,25' : '0.25'],
                    ['premium', '35', tr ? '0,25' : '0.25'],
                  ] as const
                ).map(([id, rate, delta]) => (
                  <article key={id} className="how-rate">
                    <strong>{pct(rate)}</strong>
                    <span>{names[id]}</span>
                    <i>{delta ? step(delta) : t.how.nightStart}</i>
                  </article>
                ))}
              </div>
            </>
          )}
          {index === 4 && (
            <>
              <h3>{t.how.brandTitle}</h3>
              <p>{t.how.brandLead}</p>
              <div className="how-brand-grid">
                <div className="how-brand-head">
                  <span />
                  <span>{names.account}</span>
                  <span>{names.standard}</span>
                  <span>{names.plus}</span>
                  <span>{names.premium}</span>
                </div>
                {(
                  [
                    ['Migros', '—', pct('2'), pct('4'), pct('7')],
                    ['Divan', '—', '—', pct('10'), pct('15')],
                    ['Setur', '—', '—', tr ? '%5 tur' : '5% tours', tr ? '%10 tur + otel' : '10% tours + hotel'],
                  ] as const
                ).map(([brand, temel, standard, plus, premium]) => (
                  <div key={brand} className="how-brand-row">
                    <strong>{brand}</strong>
                    {(
                      [
                        [names.account, temel],
                        [names.standard, standard],
                        [names.plus, plus],
                        [names.premium, premium],
                      ] as const
                    ).map(([plan, value]) => (
                      <span key={plan} className={value === '—' ? 'off' : ''}>
                        <em>{plan}</em>
                        {value}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
          {index === 5 && (
            <>
              <h3>{t.how.askTitle}</h3>
              <p>{t.how.askLead}</p>
              <div className="how-asks">
                {t.how.asks.map((item, beat) => (
                  <article key={item.title} className="how-ask">
                    <em>{String(beat + 1).padStart(2, '0')}</em>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="how-deck-foot">
        <div className="how-dots" role="tablist" aria-label={t.how.deckLabel}>
          {Array.from({ length: SLIDES }, (_, dot) => (
            <button
              key={dot}
              type="button"
              role="tab"
              aria-selected={dot === index}
              aria-label={t.how.position.replace('{n}', String(dot + 1)).replace('{total}', String(SLIDES))}
              className={dot === index ? 'on' : ''}
              onClick={() => go(dot)}
            />
          ))}
        </div>
        <span>
          {index === 0 && t.how.swipe}
          {index === 1 && t.how.spreadNote}
          {index === 2 && t.how.capNote}
          {index === 3 && t.how.nightNote}
          {index === 4 && t.how.brandNote}
          {index === 5 && t.how.askNote}
        </span>
      </div>
    </section>
  )
}
