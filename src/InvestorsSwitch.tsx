import { useEffect, useState } from 'react'
import { withBase } from './base.ts'
import { cachedInvestorsOpen, loadInvestorsOpen, saveInvestorsOpen } from './investorsGate.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import Spinner from './Spinner.tsx'

export default function InvestorsSwitch() {
  const { t } = useI18n()
  const [open, setOpen] = useState<boolean | null>(cachedInvestorsOpen())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void loadInvestorsOpen().then((value) => {
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
      setOpen(await saveInvestorsOpen(!open))
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
        <strong>{t.waitlist.investorsTitle}</strong>
        <p>{t.waitlist.investorsLead}</p>
        <p className="investors-switch-state">
          {open == null ? '' : open ? t.waitlist.investorsOn : t.waitlist.investorsOff}
        </p>
        {error && <p className="waitlist-action-error">{error}</p>}
      </div>
      <div className="investors-switch-actions">
        {open && (
          <a className="btn btn-ghost" href={withBase('yatirimci')} target="_blank" rel="noopener noreferrer">
            {t.waitlist.investorsPreview}
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
          {busy ? t.waitlist.investorsSaving : open ? t.waitlist.investorsClose : t.waitlist.investorsOpen}
        </button>
      </div>
    </section>
  )
}
