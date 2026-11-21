import { useEffect, useState, type FormEvent } from 'react'
import Spinner from './Spinner.tsx'
import { DEFAULT_FILM_OPACITY, defaultHeroCopy, type FilmSlot, type HeroCopy } from './heroCopyData.ts'
import { cachedHeroCopy, loadHeroCopy, saveHeroCopy } from './heroCopy.ts'
import { loadHeroFilms, uploadHeroFilm } from './heroFilm.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import { messages, readLocale } from './i18n/index.ts'

export default function HeroCopyPanel() {
  const { t } = useI18n()
  const [copy, setCopy] = useState<HeroCopy | null>(cachedHeroCopy)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [films, setFilms] = useState<{ 1: string | null; 2: string | null }>({ 1: null, 2: null })
  const [slotBusy, setSlotBusy] = useState(false)

  useEffect(() => {
    let live = true
    void loadHeroFilms().then((next) => {
      if (live) setFilms(next.slots)
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (copy) return
    let live = true
    void loadHeroCopy().then((next) => {
      if (live) setCopy(next ?? defaultHeroCopy())
    })
    return () => {
      live = false
    }
  }, [copy])

  function update(key: 'title' | 'lead', lang: 'tr' | 'en', value: string) {
    setNote('')
    setCopy((current) => (current ? { ...current, [key]: { ...current[key], [lang]: value } } : current))
  }

  async function onSave() {
    if (!copy) return
    const ready: HeroCopy = {
      title: { tr: copy.title.tr.trim(), en: copy.title.en.trim() },
      lead: { tr: copy.lead.tr.trim(), en: copy.lead.en.trim() },
      filmOpacity: copy.filmOpacity,
      filmSlot: copy.filmSlot,
    }
    setBusy(true)
    setError('')
    setNote('')
    try {
      const saved = await saveHeroCopy(ready)
      setCopy(saved)
      setNote(t.waitlist.planSaved)
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      setError(messages(readLocale()).errors[code] || code || t.errors.invalid)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span className="dot" /> {t.waitlist.tabHero}
          </div>
          <h1>{t.waitlist.heroTitle}</h1>
          <p className="lead">{t.waitlist.heroLead}</p>
        </div>
        <button type="button" className="btn btn-solid" disabled={busy || !copy} aria-busy={busy} onClick={() => void onSave()}>
          {busy ? <Spinner /> : null}
          {t.waitlist.planSave}
        </button>
      </div>
      {note && <p className="plan-editor-note">{note}</p>}
      {error && <p className="waitlist-action-error">{error}</p>}

      {copy && (
      <div className="hero-copy-form">
        <label>
          {t.waitlist.heroTitleTr}
          <textarea rows={4} maxLength={240} value={copy.title.tr} onChange={(event) => update('title', 'tr', event.target.value)} />
        </label>
        <label>
          {t.waitlist.heroTitleEn}
          <textarea rows={4} maxLength={240} value={copy.title.en} onChange={(event) => update('title', 'en', event.target.value)} />
        </label>
        <label>
          {t.waitlist.heroLeadTr}
          <textarea rows={7} maxLength={900} value={copy.lead.tr} onChange={(event) => update('lead', 'tr', event.target.value)} />
        </label>
        <label>
          {t.waitlist.heroLeadEn}
          <textarea rows={7} maxLength={900} value={copy.lead.en} onChange={(event) => update('lead', 'en', event.target.value)} />
        </label>
        <label htmlFor="hero-film-opacity">
          <span className="hero-opacity-label">
            <span>{t.waitlist.filmOpacity}</span>
            <b>{Math.round(copy.filmOpacity * 100)}%</b>
          </span>
          <input
            id="hero-film-opacity"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(copy.filmOpacity * 100)}
            onChange={(event) => {
              setNote('')
              const next = Number(event.target.value) / 100
              setCopy((current) => (current ? { ...current, filmOpacity: next } : current))
            }}
          />
          <span className="hero-opacity-hint">{t.waitlist.filmOpacityHint}</span>
        </label>
      </div>
      )}
      <section className="hero-film-admin">
        <div>
          <h2>{t.waitlist.filmTitle}</h2>
          <p>{t.waitlist.filmLead}</p>
        </div>
        <div className="hero-film-slots" role="radiogroup" aria-label={t.waitlist.filmChoose}>
          {([1, 2] as const).map((slot) => (
            <FilmSlotCard
              key={slot}
              slot={slot}
              url={films[slot]}
              live={copy?.filmSlot === slot}
              opacity={copy?.filmOpacity ?? DEFAULT_FILM_OPACITY}
              choosing={slotBusy}
              disabled={!copy}
              onChoose={() => {
                if (!copy || copy.filmSlot === slot) return
                const previous = copy
                const next = { ...copy, filmSlot: slot }
                setCopy(next)
                setSlotBusy(true)
                void saveHeroCopy(next)
                  .then((saved) => setCopy(saved))
                  .catch(() => setCopy(previous))
                  .finally(() => setSlotBusy(false))
              }}
              onUploaded={(url) => setFilms((current) => ({ ...current, [slot]: url }))}
            />
          ))}
        </div>
      </section>
    </>
  )
}

function FilmSlotCard({
  slot,
  url,
  live,
  opacity,
  choosing,
  disabled,
  onChoose,
  onUploaded,
}: {
  slot: FilmSlot
  url: string | null
  live: boolean
  opacity: number
  choosing: boolean
  disabled: boolean
  onChoose: () => void
  onUploaded: (url: string) => void
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const label = slot === 1 ? t.waitlist.filmSlot1 : t.waitlist.filmSlot2

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = event.currentTarget.elements.namedItem('film')
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined
    if (!file) {
      setError(t.waitlist.filmNeed)
      return
    }
    setBusy(true)
    setError('')
    setNote('')
    void uploadHeroFilm(file, slot)
      .then((next) => {
        onUploaded(next)
        setNote(t.waitlist.filmStored)
      })
      .catch((err: unknown) => {
        const code = err instanceof Error ? err.message : ''
        setError(code === 'film_type' ? t.waitlist.filmType : code === 'film_big' ? t.waitlist.filmBig : t.waitlist.filmFail)
      })
      .finally(() => setBusy(false))
  }

  return (
    <article className={live ? 'hero-film-slot is-live' : 'hero-film-slot'}>
      <label className="hero-film-pick">
        <input type="radio" name="film-slot" checked={live} disabled={disabled || choosing} onChange={onChoose} />
        {label}
      </label>
      <p className="hero-film-state">{url ? (live ? t.waitlist.filmReady : t.waitlist.filmStored) : t.waitlist.filmEmpty}</p>
      {live && !url && slot === 2 && <p>{t.waitlist.filmSlotFallback}</p>}
      <form onSubmit={onSubmit}>
        <label className="hero-film-file">
          {t.waitlist.filmPick}
          <input
            name="film"
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            onChange={(event) => {
              setName(event.target.files?.[0]?.name || '')
              setError('')
              setNote('')
            }}
          />
        </label>
        {name && <p className="hero-film-state">{name}</p>}
        {note && <p className="plan-editor-note">{note}</p>}
        {error && <p className="waitlist-action-error">{error}</p>}
        <button type="submit" className="btn btn-solid" disabled={busy} aria-busy={busy}>
          {busy ? <Spinner /> : null}
          {busy ? t.waitlist.filmUploading : t.waitlist.filmUpload}
        </button>
      </form>
      {url && <video className="hero-film-preview" src={url} style={{ opacity }} controls playsInline preload="metadata" />}
    </article>
  )
}
