import { useEffect, useState } from 'react'
import { withBase } from './base.ts'
import { comparisonRows, planColumns, plans } from './plans.ts'
import { apiFetch, readApiJson } from './api.ts'
import { SignupModal, SignupToast } from './SignupModal.tsx'
import { type PlanId, type SignupIntent } from './waitlist'

type Cycle = 'monthly' | 'yearly'

const faqs = [
  {
    q: 'Paket almak zorunda mıyım?',
    a: 'Hayır. Hesabını herhangi bir paket olmadan, 0 ₺’ye açarsın. IBAN, sanal kart ve temel harcama paketsiz hesaba dahildir. Standard, Plus veya Premium’u yalnızca limiti veya ayrıcalığı yükseltmek istediğinde eklersin.',
  },
  {
    q: 'AURE bir banka mı?',
    a: 'AURE, elektronik para kuruluşu lisansı modeliyle çalışan kurgusal bir neo-banka deneyimidir. Gerçek para yatırma veya hesap açma işlemi yapılmaz; bu sayfa ürün ve üyelik modelini göstermek için tasarlandı.',
  },
  {
    q: 'İstediğim zaman plan değiştirebilir miyim?',
    a: 'Evet. Paketsiz hesaptan Standard, Plus veya Premium’a anında geçebilir, dönem sonunda paketi iptal edip yine ücretsiz hesaba dönebilirsin. Yıllık planda kalan günler sonraki faturaya kredi olarak yansır.',
  },
  {
    q: 'Döviz ve ATM limitleri nasıl işler?',
    a: 'Her pakette günlük ATM döviz çekimi ve aylık indirimli döviz alım-satım limiti vardır. Limit içinde komisyon düşer; Premium’da döviz komisyonu %0 ve limit sınırsızdır. Limit üstünde standart tarife uygulanır.',
  },
  {
    q: 'Kampanyalar nasıl kullanılır?',
    a: 'Paket kampanyaları kartınla Migros, Migros Sanal Market, Divan Pastanesi ve Setur’da geçer. İndirim oranı paketine göredir; paketsiz hesapta bu kampanyalar kapalıdır.',
  },
]

const fxBases = ['USD', 'EUR', 'GBP', 'CHF'] as const

type FxQuote = { base: string; quote: string; rate: number }

function formatFx(rate: number) {
  return rate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function formatPrice(amount: number, cycle: Cycle) {
  const value = cycle === 'yearly' ? Math.round(amount * 10) : amount
  return `${value.toLocaleString('tr-TR')} ₺`
}

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <span className="yes">Var</span>
  if (value === false) return <span className="no">—</span>
  return <span>{value}</span>
}

export default function App() {
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [selected, setSelected] = useState<PlanId | null>(null)
  const [intent, setIntent] = useState<SignupIntent>('account')
  const [faq, setFaq] = useState<number | null>(0)
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [fx, setFx] = useState<FxQuote[]>([])
  const [fxError, setFxError] = useState('')

  const period = cycle === 'yearly' ? '/yıl' : '/ay'

  function openAccount() {
    setIntent('account')
    setModal(true)
  }

  function openPlan(id: PlanId) {
    setSelected(id)
    setIntent(id)
    setModal(true)
  }

  function closeModal() {
    setModal(false)
  }

  useEffect(() => {
    let cancelled = false
    async function loadFx() {
      const res = await apiFetch('/api/rates')
      const data = await readApiJson<{ quotes?: FxQuote[]; error?: string }>(res)
      if (cancelled) return
      if (res?.ok && data?.quotes?.length) {
        setFx(data.quotes)
        setFxError('')
        return
      }
      setFxError(data?.error || 'unavailable')
    }
    void loadFx()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page">
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="logo" href="#top">
            <span className="logo-mark">A</span>
            AURE
          </a>
          <nav className="nav-links">
            <a href="#plans">Paketler</a>
            <a href="#features">Özellikler</a>
            <a href="#app">Uygulama</a>
            <a href={withBase('compare')}>Karşılaştır</a>
            <a href="#faq">SSS</a>
          </nav>
          <div className="nav-cta">
            <a className="btn btn-solid" href="#plans">
              Paketleri gör
            </a>
            <button className="btn btn-ghost" onClick={openAccount}>
              Paketsiz hesap aç
            </button>
            <button className="menu-btn" aria-label="Menü" onClick={() => setMenu((v) => !v)}>
              ☰
            </button>
          </div>
        </div>
        <div className={`wrap mobile-drawer ${menu ? 'open' : ''}`}>
          <a href="#plans" onClick={() => setMenu(false)}>
            Paketler
          </a>
          <a href="#features" onClick={() => setMenu(false)}>
            Özellikler
          </a>
          <a href="#app" onClick={() => setMenu(false)}>
            Uygulama
          </a>
          <a href={withBase('compare')} onClick={() => setMenu(false)}>
            Karşılaştır
          </a>
          <a href="#faq" onClick={() => setMenu(false)}>
            SSS
          </a>
        </div>
      </header>

      <main id="top">
        <div className="wrap hero">
          <div>
            <div className="eyebrow">
              <span className="dot" /> Paket şart değil · hesap 0 ₺
            </div>
            <h1>Paran, her yerde daha güçlü.</h1>
            <p className="lead">
              Hesabını herhangi bir paket olmadan aç. IBAN, sanal kart ve günlük harcama ücretsiz. Standard, Plus veya
              Premium’u yalnızca daha fazla limit ve ayrıcalık istediğinde ekle.
            </p>
            <div className="hero-actions">
              <button className="btn btn-solid" onClick={openAccount}>
                Paketsiz hesap aç
              </button>
              <a className="btn btn-ghost" href="#plans">
                İsteğe bağlı paketler
              </a>
            </div>
            <div className="stats">
              <div>
                <strong>0 ₺</strong>
                <span>paketsiz hesap</span>
              </div>
              <div>
                <strong>3</strong>
                <span>isteğe bağlı paket</span>
              </div>
              <div>
                <strong>150+</strong>
                <span>ülkede harcama</span>
              </div>
            </div>
          </div>

          <div className={`stage is-${intent === 'account' ? 'account' : selected}`}>
            <div className="card-stack" aria-hidden="true">
              <article className="bank-card card-account">
                <span className="chip" />
                <div>
                  <small>AURE Hesap</small>
                  <b>•••• 2208</b>
                </div>
              </article>
              <article className="bank-card card-standard">
                <span className="chip" />
                <div>
                  <small>AURE Standard</small>
                  <b>•••• 4412</b>
                </div>
              </article>
              <article className="bank-card card-plus">
                <span className="chip" />
                <div>
                  <small>AURE Plus</small>
                  <b>•••• 8821</b>
                </div>
              </article>
              <article className="bank-card card-premium">
                <span className="chip" />
                <div>
                  <small>AURE Premium</small>
                  <b>•••• 1904</b>
                </div>
              </article>
            </div>
            <div className="float-pill pill-fx">
              <strong>Paketsiz</strong>
              Hesap açılışı ücretsiz
            </div>
            <div className="float-pill pill-atm">
              <strong>Sonra paket</strong>
              İstediğin gün yükselt
            </div>
          </div>
        </div>

        <div className="fx-board wrap">
          <div className="fx-head">
            <span className="eyebrow">
              <span className="dot" /> Anlık kur
            </span>
            <p>USD, EUR, GBP ve CHF — TRY karşılığı. Makas Premium’da kapanır.</p>
          </div>
          <div className="fx-grid">
            {(fx.length
              ? fx.filter((row) => (fxBases as readonly string[]).includes(row.base))
              : fxBases.map((base) => ({ base, quote: 'TRY', rate: 0 }))
            ).map(
              (row) => (
                <div key={row.base} className="fx-card">
                  <span>
                    {row.base}/{row.quote}
                  </span>
                  <strong>{row.rate ? formatFx(row.rate) : '—'}</strong>
                </div>
              ),
            )}
          </div>
          {fxError && <p className="fx-error">Kurlar alınamadı ({fxError}).</p>}
        </div>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {Array.from({ length: 10 }, () =>
              fx.length
                ? fx
                    .filter((row) => (fxBases as readonly string[]).includes(row.base))
                    .map((row) => `${row.base}/${row.quote} ${formatFx(row.rate)}`)
                : fxBases.map((c) => `${c}/TRY`),
            )
              .flat()
              .map((label, i) => (
                <span key={`${label}-${i}`}>{label}</span>
              ))}
          </div>
        </div>

        <section className="section ivory" id="plans">
          <div className="wrap">
            <div className="account-banner">
              <div>
                <span className="badge">Paket şart değil</span>
                <h2>Önce hesabını aç. Paketi sonra düşün.</h2>
                <p>
                  Paketsiz hesap 0 ₺. Limit, faiz ve kampanya (Migros, Divan, Setur) istediğinde Standard, Plus veya
                  Premium ekle.
                </p>
              </div>
              <button className="btn btn-solid" onClick={openAccount}>
                Ücretsiz hesap aç
              </button>
            </div>

            <div className="section-head">
              <div>
                <h2>İstersen paketi yükselt.</h2>
              </div>
              <div>
                <p>Paketler isteğe bağlı. Aylık öde veya yıllıkta 2 ay bizden olsun; istediğin an iptal et.</p>
                <div className="toggle" role="tablist" aria-label="Ödeme dönemi">
                  <button className={cycle === 'monthly' ? 'active' : ''} onClick={() => setCycle('monthly')}>
                    Aylık
                  </button>
                  <button className={cycle === 'yearly' ? 'active' : ''} onClick={() => setCycle('yearly')}>
                    Yıllık <span className="save-tag">2 ay bedava</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="plans">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`plan-card ${selected === plan.id ? 'selected' : ''}`}
                  onClick={() => setSelected(plan.id)}
                >
                  <div className="plan-kicker">
                    {plan.featured ? 'En çok seçilen' : 'İsteğe bağlı paket'}
                    {plan.featured && <span className="badge">Premium</span>}
                  </div>
                  <h3>{plan.name}</h3>
                  <div className="price">
                    {formatPrice(plan.monthly, cycle)}
                    <span> {period}</span>
                  </div>
                  <p style={{ margin: 0, color: 'inherit', opacity: 0.75 }}>{plan.blurb}</p>
                  <p className="perk-heading">Banka / Saving</p>
                  <ul>
                    {plan.banking.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                  <p className="perk-heading">Seyahat</p>
                  <ul>
                    {plan.travel.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                  <p className="perk-heading">Marka işbirlikleri</p>
                  <ul>
                    {plan.campaigns.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                  {selected === plan.id && (
                    <button
                      type="button"
                      className="btn btn-solid plan-add"
                      onClick={(e) => {
                        e.stopPropagation()
                        openPlan(plan.id)
                      }}
                    >
                      Bu paketi ekle
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="wrap features">
            <div className="feature-copy">
              <div className="eyebrow">
                <span className="dot" /> Tek bakiye
              </div>
              <h2>Harca, çevir, biriktir, yatırıma geç.</h2>
              <p className="lead">
                Paketsiz hesap temel nakit ve kartı açar. Üyelik ekledikçe ATM ve döviz limitleri, mevduat faizi, hisse
                komisyonu ve Migros–Setur kampanyaları açılır.
              </p>
            </div>
            <div className="feature-grid">
              <article className="feature-tile">
                <div className="icon">Fx</div>
                <h3>Döviz</h3>
                <p>Aylık indirimli döviz kotası. Premium’da komisyon %0.</p>
              </article>
              <article className="feature-tile">
                <div className="icon">%</div>
                <h3>Mevduat</h3>
                <p>Paket yükseldikçe TL mevduat faizi artar.</p>
              </article>
              <article className="feature-tile">
                <div className="icon">↑</div>
                <h3>Hisse</h3>
                <p>Alım-satım komisyonu Standard’dan Premium’a kademeli düşer.</p>
              </article>
              <article className="feature-tile">
                <div className="icon">🛒</div>
                <h3>Kampanya</h3>
                <p>Migros, Divan Pastanesi ve Setur indirimleri.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="app">
          <div className="wrap">
            <div className="section-head">
              <h2>Paketli dövizde makas yok.</h2>
              <p>
                Uygulamada EUR, USD, GBP alım-satımı piyasa kurundan. Premium’da makas %0; paketsiz hesapta fark kırmızı
                görünür.
              </p>
            </div>
            <div className="phones">
              <figure className="phone-shot">
                <div className="phone">
                  <img
                    src={withBase('app/aure-app-wallets.jpg')}
                    alt="AURE uygulamasında çoklu döviz cüzdanları ve Premium aktif rozeti"
                  />
                </div>
                <figcaption>
                  <strong>Cüzdanlar</strong>
                  Premium aktifken sınırsız çeviri, makas yok.
                </figcaption>
              </figure>
              <figure className="phone-shot featured-shot">
                <div className="phone">
                  <img
                    src={withBase('app/aure-app-fx-compare.jpg')}
                    alt="Paketsiz hesapta %0,65 makas, Premium’da makas %0 ve 120 TL daha fazla TRY"
                  />
                </div>
                <figcaption>
                  <strong>Emir özeti</strong>
                  Aynı 500 EUR: paketsiz makaslı, Premium piyasa kuru.
                </figcaption>
              </figure>
              <figure className="phone-shot">
                <div className="phone">
                  <img
                    src={withBase('app/aure-app-fx-premium.jpg')}
                    alt="Döviz ekranı: 1000 EUR eşittir 36.420 TRY, Premium makas yok"
                  />
                </div>
                <figcaption>
                  <strong>Al · Sat</strong>
                  1.000 EUR = 36.420 TRY, ek ücret yok.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="section" id="compare" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="section-head">
              <h2>Paketsiz hesap da bir seçenek.</h2>
              <p>Banka / Saving ve Kampanya satırlarını Compare plans’te yan yana gör.</p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Özellik</th>
                    {planColumns.map((col) => (
                      <th key={col.id} className="center">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {planColumns.map((col) => (
                        <td key={`${row.label}-${col.id}`} className="center">
                          <Cell value={row.values[col.id]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 18 }}>
              <a className="btn btn-solid" href={withBase('compare')}>
                Tüm özellikleri karşılaştır
              </a>
            </p>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 12 }}>
          <div className="wrap">
            <div className="section-head">
              <h2>Paket, hesabın üstüne biner.</h2>
              <p>Banka tarafında limit ve faiz; kampanyada Migros, Divan ve Setur.</p>
            </div>
            <div className="lifestyle">
              <article className="life-card a">
                <span>Banka / Saving</span>
                <h3>ATM, döviz, faiz</h3>
                <p>Günlük döviz ATM, indirimli kur kotası, hisse komisyonu ve daha yüksek mevduat.</p>
              </article>
              <article className="life-card b">
                <span>Kampanya</span>
                <h3>Migros · Divan · Setur</h3>
                <p>Market, pastane ve tatil indirimleri paketine göre açılır.</p>
              </article>
              <article className="life-card c">
                <span>Transfer</span>
                <h3>Ücretsiz EFT hakkı</h3>
                <p>Paketsiz 2 adet/ay; Premium’da sayı sınırsız.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="faq" style={{ paddingTop: 24 }}>
          <div className="wrap faq-wrap">
            <div>
              <h2>Merak edilenler.</h2>
              <p className="lead" style={{ color: 'var(--muted)' }}>
                Fiyatlar örnek niteliğindedir. Lisans, sigorta kapsamı ve ATM ağları ülkene göre değişir.
              </p>
            </div>
            <div>
              {faqs.map((item, i) => (
                <div className="faq-item" key={item.q}>
                  <button className="faq-q" onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i}>
                    {item.q}
                    <span>{faq === i ? '–' : '+'}</span>
                  </button>
                  <div className={`faq-a ${faq === i ? 'open' : ''}`}>{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="wrap">
          <div className="cta-band">
            <div>
              <h2>Paket yok. Hesap var.</h2>
              <p>Önce ücretsiz hesabını aç. Standard, Plus veya Premium’u gerçekten ihtiyaç olunca ekle.</p>
            </div>
            <button className="btn btn-dark" onClick={openAccount}>
              Paketsiz hesap aç
            </button>
          </div>
        </div>
      </main>

      <footer>
        <div className="wrap foot">
          <span>© 2026 AURE. Kurgusal ürün — gerçek bankacılık hizmeti sunmaz.</span>
          <span>
            Paketsiz hesap · Standard · Plus · Premium ·{' '}
            <a href={withBase('waitlist')}>Waiting list</a>
          </span>
        </div>
      </footer>

      {modal && (
        <SignupModal
          intent={intent}
          onClose={(msg) => {
            closeModal()
            if (msg) setToast(msg)
          }}
        />
      )}
      {toast && <SignupToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
