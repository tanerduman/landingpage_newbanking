import { useState } from 'react'
import SiteHeader from './SiteHeader.tsx'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'

export default function PartnersPage() {
  const { t } = useI18n()
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  return (
    <div className="page">
      <SiteHeader active="partners" onRequest={() => setModal(true)} />
      <main className="wrap partners-main">
        <p className="hero-kicker">
          <span className="dot" /> {t.partners.kicker}
        </p>
        <h1>{t.partners.title}</h1>
        <p className="partners-lead">{t.partners.lead}</p>
        <div className="partner-grid">
          {t.partners.items.map((item) => (
            <article className="partner-card" key={item.id}>
              <h2>{item.name}</h2>
              <p>{item.body}</p>
              <div className="partner-meta">{item.meta}</div>
            </article>
          ))}
        </div>
        <p className="partners-note">{t.partners.note}</p>
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
