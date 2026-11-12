import { useState } from 'react'
import SiteHeader from './SiteHeader.tsx'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import { useI18n } from './i18n/LocaleContext.tsx'

function MonthFigure({ before, after }: { before: string; after: string }) {
  return (
    <div className="blog-fig">
      <div className="blog-fig-row">
        <span>{before}</span>
        <svg viewBox="0 0 520 128" aria-hidden="true">
          <g className="blog-fig-lines">
            <path d="M8 22H150" />
            <path d="M8 46H230" />
            <path d="M8 70H110" />
            <path d="M8 94H250" />
          </g>
          <g className="blog-fig-pile">
            <path d="M300 28H470" />
            <path d="M330 50H500" />
            <path d="M286 72H450" />
            <path d="M348 94H492" />
          </g>
        </svg>
      </div>
      <div className="blog-fig-row">
        <span>{after}</span>
        <svg viewBox="0 0 520 72" aria-hidden="true">
          <rect className="blog-fig-fee" x="8" y="16" width="148" height="40" rx="20" />
          <path className="blog-fig-calm" d="M172 36H500" />
          <g className="blog-fig-dot">
            <circle cx="230" cy="36" r="4" />
            <circle cx="300" cy="36" r="4" />
            <circle cx="370" cy="36" r="4" />
            <circle cx="440" cy="36" r="4" />
            <circle cx="500" cy="36" r="4" />
          </g>
        </svg>
      </div>
    </div>
  )
}

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
        <figure className="blog-figure">
          <MonthFigure before={t.blog.figureBefore} after={t.blog.figureAfter} />
          <figcaption>{t.blog.figureCaption}</figcaption>
        </figure>
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
