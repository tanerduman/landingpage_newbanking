import { useState } from 'react'
import { withBase } from './base.ts'
import SiteHeader from './SiteHeader.tsx'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'

export default function BlogPage() {
  const { t } = useI18n()
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  return (
    <div className="page">
      <SiteHeader active="blog" onRequest={() => setModal(true)} />
      <main className="wrap blog-page">
        <p className="hero-kicker">
          <span className="dot" /> {t.blog.kicker}
        </p>
        <h1>{t.blog.title}</h1>
        <p className="blog-meta">{t.blog.date}</p>
        <p className="blog-lead">{t.blog.lead}</p>
        <ul className="blog-layers">
          {t.blog.layers.map((layer) => (
            <li key={layer.name}>
              <strong>{layer.name}</strong>
              <span>{layer.note}</span>
            </li>
          ))}
        </ul>
        <article className="blog-article">
          {t.blog.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </article>
        <div className="blog-end">
          <p>{t.blog.more}</p>
          <div className="blog-actions">
            <button type="button" className="btn btn-solid" onClick={() => setModal(true)}>
              {t.nav.request}
            </button>
            <a className="btn btn-ghost" href={withBase('karsilastir')}>
              {t.blog.compare}
            </a>
            <a className="btn btn-ghost" href={withBase('hesaplama')}>
              {t.blog.calc}
            </a>
          </div>
        </div>
      </main>
      <footer>
        <div className="wrap foot">
          <span>{t.footer.legal}</span>
        </div>
      </footer>
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
