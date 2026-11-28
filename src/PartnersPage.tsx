import { useEffect, useState } from 'react'
import PartnerMark from './PartnerMark.tsx'
import SiteHeader from './SiteHeader.tsx'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'
import { cachedPartnersOpen, loadPartnersOpen } from './partnersGate.ts'

export default function PartnersPage() {
  const { t } = useI18n()
  const [open, setOpen] = useState<boolean | null>(cachedPartnersOpen())
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadPartnersOpen().then((value) => {
      if (!cancelled) setOpen(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const visible = open !== false

  return (
    <div className="page">
      <SiteHeader active="partners" onRequest={() => setModal(true)} />
      <main className="wrap partners-main">
        {visible ? (
          <>
            <p className="hero-kicker">
              <span className="dot" /> {t.partners.kicker}
            </p>
            <h1>{t.partners.title}</h1>
            <p className="partners-lead">{t.partners.lead}</p>
            <div className="partner-grid">
              {t.partners.items.map((item) => (
                <article className="partner-card" key={item.id}>
                  <div className={`partner-logo partner-logo-${item.id}`}>
                    <PartnerMark id={item.id} />
                  </div>
                  <h2>{item.name}</h2>
                  <p>{item.body}</p>
                  <div className="partner-meta">{item.meta}</div>
                </article>
              ))}
            </div>
            <p className="partners-note">{t.partners.note}</p>
          </>
        ) : (
          <>
            <p className="hero-kicker">
              <span className="dot" /> {t.partners.kicker}
            </p>
            <h1>{t.partners.closedTitle}</h1>
            <p className="partners-lead">{t.partners.closedLead}</p>
          </>
        )}
      </main>
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
