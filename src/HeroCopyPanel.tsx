import { useEffect, useState } from 'react'
import Spinner from './Spinner.tsx'
import { DEFAULT_FILM_OPACITY, defaultHeroCopy, type HeroCopy } from './heroCopyData.ts'
import { cachedHeroCopy, loadHeroCopy, saveHeroCopy } from './heroCopy.ts'
import { loadHeroFilm, uploadHeroFilm } from './heroFilm.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import { messages, readLocale } from './i18n/index.ts'

export default function HeroCopyPanel() {
  const { t } = useI18n()
  const [copy, setCopy] = useState<HeroCopy | null>(cachedHeroCopy)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [filmUrl, setFilmUrl] = useState<string | null>(null)
  const [filmBusy, setFilmBusy] = useState(false)
  const [filmNote, setFilmNote] = useState('')
  const [filmError, setFilmError] = useState('')
  const [filmName, setFilmName] = useState('')

  useEffect(() => {
    let live = true
    void loadHeroFilm().then((url) => {
      if (live) setFilmUrl(url)
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
      <form
        className="hero-film-admin"
        onSubmit={(event) => {
          event.preventDefault()
          const input = event.currentTarget.elements.namedItem('film')
          const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined
          if (!file) {
            setFilmError(t.waitlist.filmNeed)
            return
          }
          setFilmBusy(true)
          setFilmError('')
          setFilmNote('')
          void uploadHeroFilm(file)
            .then((url) => {
              setFilmUrl(url)
              setFilmNote(t.waitlist.filmReady)
            })
            .catch((err: unknown) => {
              const code = err instanceof Error ? err.message : ''
              setFilmError(code === 'film_type' ? t.waitlist.filmType : code === 'film_big' ? t.waitlist.filmBig : t.waitlist.filmFail)
            })
            .finally(() => setFilmBusy(false))
        }}
      >
        <div>
          <h2>{t.waitlist.filmTitle}</h2>
          <p>{t.waitlist.filmLead}</p>
          <p className="hero-film-state">{filmUrl ? t.waitlist.filmReady : t.waitlist.filmEmpty}</p>
        </div>
        <label className="hero-film-file">
          {t.waitlist.filmPick}
          <input
            name="film"
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            onChange={(event) => {
              setFilmName(event.target.files?.[0]?.name || '')
              setFilmError('')
              setFilmNote('')
            }}
          />
        </label>
        {filmName && <p className="hero-film-state">{filmName}</p>}
        {filmNote && <p className="plan-editor-note">{filmNote}</p>}
        {filmError && <p className="waitlist-action-error">{filmError}</p>}
        {filmUrl && (
          <video
            className="hero-film-preview"
            src={filmUrl}
            style={{ opacity: copy?.filmOpacity ?? DEFAULT_FILM_OPACITY }}
            controls
            playsInline
            preload="metadata"
          />
        )}
        <button type="submit" className="btn btn-solid" disabled={filmBusy} aria-busy={filmBusy}>
          {filmBusy ? <Spinner /> : null}
          {filmBusy ? t.waitlist.filmUploading : t.waitlist.filmUpload}
        </button>
      </form>
    </>
  )
}
