import { useEffect, useState } from 'react'
import { withBase } from './base.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import { cachedPartnersOpen, loadPartnersOpen, savePartnersOpen } from './partnersGate.ts'
import Spinner from './Spinner.tsx'

export default function PartnersSwitch() {
  const { t } = useI18n()
  const [open, setOpen] = useState<boolean | null>(cachedPartnersOpen())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void loadPartnersOpen().then((value) => {
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
      setOpen(await savePartnersOpen(!open))
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
        <strong>{t.waitlist.partnersTitle}</strong>
        <p>{t.waitlist.partnersLead}</p>
        <p className="investors-switch-state">
          {open == null ? '' : open ? t.waitlist.partnersOn : t.waitlist.partnersOff}
        </p>
        {error && <p className="waitlist-action-error">{error}</p>}
      </div>
      <div className="investors-switch-actions">
        {open && (
          <a className="btn btn-ghost" href={withBase('isbirlikleri')} target="_blank" rel="noopener noreferrer">
            {t.waitlist.partnersPreview}
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
          {busy ? t.waitlist.partnersSaving : open ? t.waitlist.partnersClose : t.waitlist.partnersOpen}
        </button>
      </div>
    </section>
  )
}
