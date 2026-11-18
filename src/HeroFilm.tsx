import { useEffect, useRef, useState } from 'react'
import { useI18n } from './i18n/LocaleContext.tsx'
import LogoMark from './LogoMark.tsx'

const SCENE_MS = 3000
const SCENE_COUNT = 4

function filmClock(ms: number) {
  const seconds = Math.min(12, Math.floor(ms / 1000))
  return `0:${String(seconds).padStart(2, '0')}`
}

export default function HeroFilm() {
  const { t } = useI18n()
  const copy = t.hero.film
  const [run, setRun] = useState<'idle' | 'play' | 'done'>('idle')
  const [index, setIndex] = useState(0)
  const elapsedRef = useRef(0)
  const barRef = useRef<HTMLSpanElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (run !== 'play') return
    const total = SCENE_COUNT * SCENE_MS
    const origin = performance.now() - elapsedRef.current
    let last = Math.min(SCENE_COUNT - 1, Math.floor(elapsedRef.current / SCENE_MS))
    let frame = 0
    const step = (now: number) => {
      const next = Math.min(total, now - origin)
      elapsedRef.current = next
      if (barRef.current) barRef.current.style.transform = `scaleX(${next / total})`
      if (clockRef.current) clockRef.current.textContent = filmClock(next)
      const scene = Math.min(SCENE_COUNT - 1, Math.floor(next / SCENE_MS))
      if (scene !== last) {
        last = scene
        setIndex(scene)
      }
      if (next >= total) {
        if (clockRef.current) clockRef.current.textContent = filmClock(total)
        setIndex(SCENE_COUNT - 1)
        setRun('done')
        return
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [run])

  function toggle() {
    if (run === 'play') {
      setRun('idle')
      return
    }
    if (run === 'done') {
      elapsedRef.current = 0
      setIndex(0)
      if (barRef.current) barRef.current.style.transform = 'scaleX(0)'
      if (clockRef.current) clockRef.current.textContent = filmClock(0)
    }
    setRun('play')
  }

  const label = run === 'play' ? copy.pause : run === 'done' ? copy.replay : copy.play

  return (
    <button type="button" className={`hero-film is-${run} is-scene-${index}`} onClick={toggle} aria-pressed={run === 'play'} aria-label={label}>
      <div className="film-stage" aria-hidden="true">
        <article className={`film-scene brand${index === 0 ? ' is-on' : ''}`}>
          <LogoMark className="film-mark" />
          <p className="film-kicker">{copy.scenes[0].kicker}</p>
          <h2>{copy.scenes[0].title}</h2>
          <p>{copy.scenes[0].note}</p>
        </article>
        <article className={`film-scene night${index === 1 ? ' is-on' : ''}`}>
          <p className="film-kicker">{copy.scenes[1].kicker}</p>
          <h2 className="film-rate">{copy.rate}</h2>
          <p>{copy.scenes[1].note}</p>
        </article>
        <article className={`film-scene spread${index === 2 ? ' is-on' : ''}`}>
          <p className="film-kicker">{copy.scenes[2].kicker}</p>
          <h2>{copy.scenes[2].title}</h2>
          <ul className="film-bands">
            {copy.bands.map((band) => (
              <li key={band.name}>
                <span>{band.name}</span>
                <b>{band.value}</b>
              </li>
            ))}
          </ul>
        </article>
        <article className={`film-scene end${index === 3 ? ' is-on' : ''}`}>
          <p className="film-kicker">{copy.scenes[3].kicker}</p>
          <h2>{copy.scenes[3].title}</h2>
          <p>{copy.scenes[3].note}</p>
          <span className="film-cta">{t.nav.queue}</span>
        </article>
      </div>
      <div className="film-top" aria-hidden="true">
        <span className="film-badge">
          <i />
          {copy.label}
        </span>
        <span className="film-clock">
          <span ref={clockRef}>0:00</span>
          <span> / {copy.duration}</span>
        </span>
      </div>
      <div className="film-bottom" aria-hidden="true">
        <span className="film-control">
          {run === 'play' ? (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4.5 3.2 H6.6 V12.8 H4.5 Z M9.4 3.2 H11.5 V12.8 H9.4 Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5.2 3.4 L12.4 8 L5.2 12.6 Z" />
            </svg>
          )}
        </span>
        <span className="film-track">
          <span ref={barRef} className="film-fill" />
        </span>
      </div>
    </button>
  )
}
