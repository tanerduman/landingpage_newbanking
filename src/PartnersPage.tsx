import { useState } from 'react'
import SiteHeader from './SiteHeader.tsx'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'

const marks = ['migros', 'setur', 'divan', 'koctas', 'uber', 'trendyol', 'neo'] as const

type Mark = (typeof marks)[number]

function isMark(id: string): id is Mark {
  return (marks as readonly string[]).includes(id)
}

function Wordmark({ id }: { id: string }) {
  if (!isMark(id)) return null
  if (id === 'uber') {
    return (
      <div className={`partner-mark partner-mark-${id}`}>
        Uber <i>Eats</i>
      </div>
    )
  }
  const label = {
    migros: 'migros',
    setur: 'SETUR',
    divan: 'DİVAN',
    koctas: 'Koçtaş',
    trendyol: 'trendyol',
    neo: 'NEO SKOLA',
  }[id]
  return <div className={`partner-mark partner-mark-${id}`}>{label}</div>
}

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
              <Wordmark id={item.id} />
              <div className="partner-cat">{item.category}</div>
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
          cycle="none"
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
