import { useEffect, useState } from 'react'
import { defaultHeroCopy, type HeroCopy } from './heroCopyData.ts'
import { cachedHeroCopy, loadHeroCopy, saveHeroCopy } from './heroCopy.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import { messages, readLocale } from './i18n/index.ts'

export default function HeroCopyPanel() {
  const { t } = useI18n()
  const [copy, setCopy] = useState<HeroCopy | null>(cachedHeroCopy)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

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
        <button type="button" className="btn btn-solid" disabled={busy || !copy} onClick={() => void onSave()}>
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
      </div>
      )}
    </>
  )
}
