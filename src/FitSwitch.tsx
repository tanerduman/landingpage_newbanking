import { useEffect, useState } from 'react'
import { withBase } from './base.ts'
import { cachedFitOpen, loadFitOpen, saveFitOpen } from './fitGate.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import Spinner from './Spinner.tsx'

export default function FitSwitch() {
  const { t } = useI18n()
  const [open, setOpen] = useState<boolean | null>(cachedFitOpen())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void loadFitOpen().then((value) => {
      if (!cancelled) setOpen(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function toggle() {
    if (open == null || busy) return
    setBusy(true)
    setError('')
    try {
      setOpen(await saveFitOpen(!open))
    } catch (err) {
      const code = err instanceof Error ? err.message : 'offline'
      setError(t.errors[code] || code)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="investors-switch">
      <div>
        <strong>{t.waitlist.fitTitle}</strong>
        <p>{t.waitlist.fitLead}</p>
        <p className="investors-switch-state">{open == null ? '' : open ? t.waitlist.fitOn : t.waitlist.fitOff}</p>
        {error && <p className="waitlist-action-error">{error}</p>}
      </div>
      <div className="investors-switch-actions">
        {open && (
          <a className="btn btn-ghost" href={withBase('uygun-paket')} target="_blank" rel="noopener noreferrer">
            {t.waitlist.fitPreview}
          </a>
        )}
        <button
          type="button"
          role="switch"
          className={`investors-toggle${open ? ' on' : ''}`}
          aria-checked={open === true}
          disabled={open == null || busy}
          aria-busy={busy}
          onClick={() => void toggle()}
        >
          {busy ? <Spinner /> : null}
          {busy ? t.waitlist.fitSaving : open ? t.waitlist.fitClose : t.waitlist.fitOpen}
        </button>
      </div>
    </section>
  )
}
