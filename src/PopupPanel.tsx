import { useEffect, useState } from 'react'
import { useI18n } from './i18n/LocaleContext.tsx'
import { messages, readLocale } from './i18n/index.ts'
import { blankPopup, fetchPopupAdmin, POPUP_LIMIT, savePopupCatalog, type PopupStat, type SitePopup } from './popupCopy.ts'
import type { PopupText } from './popupCopyData.ts'
import Spinner from './Spinner.tsx'

function newPopupId() {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return `p${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

export default function PopupPanel() {
  const { t } = useI18n()
  const [popups, setPopups] = useState<SitePopup[] | null>(null)
  const [stats, setStats] = useState<PopupStat[]>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [armed, setArmed] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void fetchPopupAdmin().then((admin) => {
      if (!live) return
      if (!admin) {
        setError(messages(readLocale()).errors.offline)
        return
      }
      setPopups(admin.popups)
      setStats(admin.stats)
    })
    return () => {
      live = false
    }
  }, [])

  function update(id: string, patch: Partial<SitePopup>) {
    setNote('')
    setPopups((current) => current?.map((popup) => (popup.id === id ? { ...popup, ...patch } : popup)) ?? current)
  }

  function updateText(id: string, key: 'kicker' | 'tag' | 'question' | 'yes' | 'no', lang: keyof PopupText, value: string) {
    setPopups((current) =>
      current?.map((popup) => (popup.id === id ? { ...popup, [key]: { ...popup[key], [lang]: value } } : popup)) ?? current,
    )
    setNote('')
  }

  function move(index: number, delta: number) {
    setPopups((current) => {
      if (!current) return current
      const next = [...current]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      const [row] = next.splice(index, 1)
      next.splice(target, 0, row)
      return next
    })
    setNote('')
  }

  async function onSave() {
    if (!popups) return
    const ready = popups.map((popup) => ({
      ...popup,
      kicker: { tr: popup.kicker.tr.trim(), en: popup.kicker.en.trim() },
      tag: { tr: popup.tag.tr.trim(), en: popup.tag.en.trim() },
      question: { tr: popup.question.tr.trim(), en: popup.question.en.trim() },
      yes: { tr: popup.yes.tr.trim(), en: popup.yes.en.trim() },
      no: { tr: popup.no.tr.trim(), en: popup.no.en.trim() },
    }))
    if (ready.some((popup) => !popup.question.tr || !popup.question.en || !popup.yes.tr || !popup.yes.en || !popup.no.tr || !popup.no.en)) {
      setError(t.errors.invalid)
      return
    }
    setBusy(true)
    setError('')
    setNote('')
    try {
      const saved = await savePopupCatalog(ready)
      setPopups(saved.popups)
      setStats(saved.stats)
      setArmed(null)
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
            <span className="dot" /> {t.waitlist.tabPopups}
          </div>
          <h1>{t.waitlist.popupTitle}</h1>
          <p className="lead">{t.waitlist.popupLead}</p>
        </div>
        <div className="popup-head-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy || !popups || popups.length >= POPUP_LIMIT}
            onClick={() => {
              setPopups((current) => {
                if (!current) return current
                let id = newPopupId()
                while (current.some((popup) => popup.id === id)) id = newPopupId()
                return [...current, blankPopup(id)]
              })
              setNote('')
            }}
          >
            {t.waitlist.popupAdd}
          </button>
          <button type="button" className="btn btn-solid" disabled={busy || !popups} aria-busy={busy} onClick={() => void onSave()}>
            {busy ? <Spinner /> : null}
            {t.waitlist.planSave}
          </button>
        </div>
      </div>
      {note && <p className="plan-editor-note">{note}</p>}
      {error && <p className="waitlist-action-error">{error}</p>}
      {popups && popups.length === 0 ? <p className="waitlist-empty">{t.waitlist.popupEmpty}</p> : null}
      <div className="popup-list">
        {popups?.map((popup, index) => {
          const stat = stats.find((item) => item.id === popup.id)
          return (
            <article key={popup.id} className="popup-card">
              <div className="popup-card-top">
                <label className="popup-active">
                  <input
                    type="checkbox"
                    checked={popup.active}
                    onChange={(event) => update(popup.id, { active: event.target.checked })}
                  />
                  {t.waitlist.popupActive}
                </label>
                <div className="popup-card-actions">
                  <button type="button" disabled={index === 0} onClick={() => move(index, -1)}>
                    {t.waitlist.popupUp}
                  </button>
                  <button type="button" disabled={index === popups.length - 1} onClick={() => move(index, 1)}>
                    {t.waitlist.popupDown}
                  </button>
                  <button
                    type="button"
                    className={`row-delete${armed === popup.id ? ' armed' : ''}`}
                    onClick={() => {
                      if (armed !== popup.id) {
                        setArmed(popup.id)
                        return
                      }
                      setPopups((current) => current?.filter((item) => item.id !== popup.id) ?? current)
                      setArmed(null)
                      setNote('')
                    }}
                  >
                    {armed === popup.id ? t.waitlist.deleteConfirm : t.waitlist.delete}
                  </button>
                </div>
              </div>
              <div className="popup-fields">
                <label>
                  {t.waitlist.popupKickerTr}
                  <input maxLength={32} value={popup.kicker.tr} onChange={(event) => updateText(popup.id, 'kicker', 'tr', event.target.value)} />
                </label>
                <label>
                  {t.waitlist.popupKickerEn}
                  <input maxLength={32} value={popup.kicker.en} onChange={(event) => updateText(popup.id, 'kicker', 'en', event.target.value)} />
                </label>
                <label>
                  {t.waitlist.popupTagTr}
                  <input maxLength={24} value={popup.tag.tr} onChange={(event) => updateText(popup.id, 'tag', 'tr', event.target.value)} />
                </label>
                <label>
                  {t.waitlist.popupTagEn}
                  <input maxLength={24} value={popup.tag.en} onChange={(event) => updateText(popup.id, 'tag', 'en', event.target.value)} />
                </label>
                <label className="popup-span">
                  {t.waitlist.popupQuestionTr}
                  <textarea rows={3} maxLength={280} value={popup.question.tr} onChange={(event) => updateText(popup.id, 'question', 'tr', event.target.value)} />
                </label>
                <label className="popup-span">
                  {t.waitlist.popupQuestionEn}
                  <textarea rows={3} maxLength={280} value={popup.question.en} onChange={(event) => updateText(popup.id, 'question', 'en', event.target.value)} />
                </label>
                <label>
                  {t.waitlist.popupYesTr}
                  <input maxLength={40} value={popup.yes.tr} onChange={(event) => updateText(popup.id, 'yes', 'tr', event.target.value)} />
                </label>
                <label>
                  {t.waitlist.popupYesEn}
                  <input maxLength={40} value={popup.yes.en} onChange={(event) => updateText(popup.id, 'yes', 'en', event.target.value)} />
                </label>
                <label>
                  {t.waitlist.popupNoTr}
                  <input maxLength={32} value={popup.no.tr} onChange={(event) => updateText(popup.id, 'no', 'tr', event.target.value)} />
                </label>
                <label>
                  {t.waitlist.popupNoEn}
                  <input maxLength={32} value={popup.no.en} onChange={(event) => updateText(popup.id, 'no', 'en', event.target.value)} />
                </label>
              </div>
              <p className="popup-stats">
                <span>
                  {t.waitlist.popupShown} <strong>{stat?.shown ?? 0}</strong>
                </span>
                <span>
                  {t.waitlist.popupYesCount} <strong>{stat?.yes ?? 0}</strong>
                </span>
                <span>
                  {t.waitlist.popupNoCount} <strong>{stat?.no ?? 0}</strong>
                </span>
              </p>
            </article>
          )
        })}
      </div>
    </>
  )
}
