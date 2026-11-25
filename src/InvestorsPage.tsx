import { useEffect, useState, type PointerEvent } from 'react'
import SiteHeader from './SiteHeader.tsx'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import { cachedInvestorsOpen, loadInvestorsOpen } from './investorsGate.ts'
import { useI18n } from './i18n/LocaleContext.tsx'

export default function InvestorsPage() {
  const { t } = useI18n()
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [open, setOpen] = useState<boolean | null>(cachedInvestorsOpen())

  useEffect(() => {
    let cancelled = false
    void loadInvestorsOpen().then((value) => {
      if (!cancelled) setOpen(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page">
      <SiteHeader active="investors" onRequest={() => setModal(true)} />
      <main className="wrap investors-main">
        {open == null ? null : open ? (
          <Deck />
        ) : (
          <>
            <p className="hero-kicker">
              <span className="dot" /> {t.investors.kicker}
            </p>
            <h1>{t.investors.closedTitle}</h1>
            <p className="investors-closed">{t.investors.closedLead}</p>
          </>
        )}
      </main>
      <footer>
        <div className="wrap foot">
          <span>{t.footer.legal}</span>
        </div>
      </footer>
      {modal && (
        <SignupModal
          intent="account"
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

function Deck() {
  const { t } = useI18n()
  const slides = t.investors.slides
  const [index, setIndex] = useState(0)
  const [startX, setStartX] = useState<number | null>(null)
  const slide = slides[Math.min(index, slides.length - 1)]
  const position = t.investors.position
    .replace('{n}', String(index + 1).padStart(2, '0'))
    .replace('{total}', String(slides.length).padStart(2, '0'))

  function go(next: number) {
    setIndex(Math.min(slides.length - 1, Math.max(0, next)))
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setIndex((current) => Math.min(slides.length - 1, current + 1))
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setIndex((current) => Math.max(0, current - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slides.length])

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    setStartX(event.clientX)
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    if (startX == null) return
    const dx = event.clientX - startX
    setStartX(null)
    if (dx <= -48) go(index + 1)
    if (dx >= 48) go(index - 1)
  }

  return (
    <section
      className="investors-stage"
      aria-roledescription="carousel"
      aria-label={t.investors.deckLabel}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div className="investors-top">
        <span className="how-deck-count">
          <span className="dot" />
          {position}
        </span>
        <span className="investors-nav">
          <button type="button" aria-label={t.investors.prev} onClick={() => go(index - 1)} disabled={index === 0}>
            ‹
          </button>
          <button
            type="button"
            aria-label={t.investors.next}
            onClick={() => go(index + 1)}
            disabled={index === slides.length - 1}
          >
            ›
          </button>
        </span>
      </div>
      <p className="investors-kicker">{slide.kicker}</p>
      <h1>{slide.title}</h1>
      <p className="investors-body">{slide.body}</p>
      {slide.points.length > 0 && (
        <ul className="investors-points">
          {slide.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}
      {index === slides.length - 1 && (
        <a
          className="btn btn-solid investors-linkedin"
          href="https://www.linkedin.com/company/getaure"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.investors.linkedin}
        </a>
      )}
      <div className="investors-foot">
        <div className="how-dots" role="tablist" aria-label={t.investors.deckLabel}>
          {slides.map((item, dot) => (
            <button
              key={item.kicker}
              type="button"
              role="tab"
              className={dot === index ? 'on' : ''}
              aria-label={item.kicker}
              aria-selected={dot === index}
              onClick={() => go(dot)}
            />
          ))}
        </div>
        <p className="investors-note">{t.investors.disclaimer}</p>
      </div>
    </section>
  )
}
