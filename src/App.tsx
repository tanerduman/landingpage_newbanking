import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { addWaitlistEntry, type PlanId, type SignupIntent } from './waitlist'

type Cycle = 'monthly' | 'yearly'

const plans: {
  id: PlanId
  name: string
  monthly: number
  blurb: string
  perks: string[]
  featured?: boolean
}[] = [
  {
    id: 'standard',
    name: 'Standard',
    monthly: 49,
    blurb: 'Günlük harcamayı daha rahat yönet.',
    perks: ['Fiziksel kart dahil', '1.000 €/ay ücretsiz ATM', 'Hafta içi piyasa kuruna yakın döviz', 'Anlık bildirimler'],
  },
  {
    id: 'plus',
    name: 'Plus',
    monthly: 99,
    blurb: 'Daha yüksek limit, daha az sürpriz.',
    perks: ['Sınırsız yerel transfer', '3.000 €/ay ücretsiz ATM', 'Alışveriş koruması', 'Öncelikli destek'],
  },
  {
    id: 'premium',
    name: 'Premium',
    monthly: 249,
    blurb: 'Seyahat ve döviz için en dengeli plan.',
    perks: ['Sınırsız ücretsiz döviz', 'Yurtdışı sağlık sigortası', 'LoungeKey erişimi', 'Kripto ve hisse alımında düşük komisyon'],
    featured: true,
  },
]

const compareColumns = ['Paketsiz hesap', ...plans.map((p) => p.name)]

const comparison = [
  { label: 'Aylık ücret', values: ['0 ₺', '49 ₺', '99 ₺', '249 ₺'] },
  { label: 'Hesap açılışı', values: [true, true, true, true] },
  { label: 'Sanal kart', values: [true, true, true, true] },
  { label: 'Fiziksel kart', values: ['İsteğe bağlı', 'Plastik', 'Plus kart', 'Premium kart'] },
  { label: 'Ücretsiz döviz', values: ['250 €/ay', '1.000 €/ay', '3.000 €/ay', 'Sınırsız'] },
  { label: 'ATM çekimi', values: ['200 €/ay', '1.000 €/ay', '3.000 €/ay', '800 €/ay yurtdışı'] },
  { label: 'Seyahat sigortası', values: [false, false, false, true] },
  { label: 'Lounge erişimi', values: [false, false, false, '2 misafir'] },
]

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
    q: 'Döviz ücreti nasıl işler?',
    a: 'Hafta içi piyasa kuruna yakın fiyatlanır. Paketsiz hesap, Standard ve Plus’ta aylık ücretsiz döviz limiti vardır; limiti aşınca küçük bir makas uygulanır. Premium’da döviz limitsiz ve ücretsizdir.',
  },
]

const currencies = ['EUR', 'USD', 'GBP', 'TRY', 'CHF', 'JPY', 'AUD', 'CAD', 'NOK', 'SEK', 'AED', 'PLN']

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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const period = cycle === 'yearly' ? '/yıl' : '/ay'
  const selectedPlan = useMemo(() => plans.find((p) => p.id === selected), [selected])

  function openAccount() {
    setIntent('account')
    setError('')
    setModal(true)
  }

  function openPlan(id: PlanId) {
    setSelected(id)
    setIntent(id)
    setError('')
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setError('')
  }

  function closeToast() {
    setToast(null)
  }

  useEffect(() => {
    if (!modal && !toast) return

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (modal) closeModal()
      else closeToast()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, toast])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) {
      setError('Lütfen adını yaz.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Geçerli bir e-posta gir.')
      return
    }
    addWaitlistEntry({ name, email, intent })
    setModal(false)
    setToast(
      intent === 'account'
        ? 'Paketsiz hesabın için sıraya alındın.'
        : `${selectedPlan?.name ?? 'Paket'} için sıraya alındın.`,
    )
    setName('')
    setEmail('')
    window.setTimeout(() => setToast(null), 3200)
  }

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
            <a href="#compare">Karşılaştır</a>
            <a href="#faq">SSS</a>
          </nav>
          <div className="nav-cta">
            <a className="btn btn-ghost" href="#plans">
              Paketleri gör
            </a>
            <button className="btn btn-solid" onClick={openAccount}>
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
          <a href="#compare" onClick={() => setMenu(false)}>
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

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...currencies, ...currencies].map((c, i) => (
              <span key={`${c}-${i}`}>{c} · anlık kur</span>
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
                  Paketsiz hesap 0 ₺. Transfer, sanal kart ve temel döviz yeter. Limit, sigorta veya lounge istediğinde
                  Standard, Plus ya da Premium’u tek dokunuşla ekle.
                </p>
              </div>
              <button className="btn btn-dark" onClick={openAccount}>
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
                  className={`plan-card ${plan.featured ? 'featured' : ''} ${selected === plan.id ? 'selected' : ''}`}
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
                  <ul>
                    {plan.perks.map((perk) => (
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
                Paketsiz hesap temel nakit ve kartı açar. Üyelik ekledikçe döviz limiti, sigorta ve lounge gibi yaşam
                ayrıcalıkları devreye girer — hesap her zaman senin kalır.
              </p>
            </div>
            <div className="feature-grid">
              <article className="feature-tile">
                <div className="icon">Fx</div>
                <h3>Döviz</h3>
                <p>Hafta içi piyasa kuruna yakın çevir. Premium’da makas yok.</p>
              </article>
              <article className="feature-tile">
                <div className="icon">%</div>
                <h3>Kasa</h3>
                <p>Günlük faizlenen kasalar; paketsiz hesapta da açık.</p>
              </article>
              <article className="feature-tile">
                <div className="icon">↑</div>
                <h3>Yatırım</h3>
                <p>Hisse ve kripto. Paketle komisyon düşer, anlık al-sat açılır.</p>
              </article>
              <article className="feature-tile">
                <div className="icon">✈</div>
                <h3>Seyahat</h3>
                <p>Sigorta ve lounge Premium’da. Kartını uçağa binmeden dondur.</p>
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
                    src="/app/aure-app-wallets.jpg"
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
                    src="/app/aure-app-fx-compare.jpg"
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
                    src="/app/aure-app-fx-premium.jpg"
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
              <p>Soldaki sütun ücretsiz hesap. Diğer üçü, üzerine ekleyebileceğin paketler.</p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Özellik</th>
                    {compareColumns.map((name) => (
                      <th key={name} className="center">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {row.values.map((value, i) => (
                        <td key={`${row.label}-${i}`} className="center">
                          <Cell value={value} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 12 }}>
          <div className="wrap">
            <div className="section-head">
              <h2>Paket, hesabın üstüne biner.</h2>
              <p>Hesabı kaybetmezsin. Premium seyahati açar; Plus limiti; Standard günlük konforu.</p>
            </div>
            <div className="lifestyle">
              <article className="life-card a">
                <span>Paketsiz</span>
                <h3>Hesap + sanal kart</h3>
                <p>IBAN ve uygulama ücretsiz. Harcamaya hemen başla, paket sonra.</p>
              </article>
              <article className="life-card b">
                <span>Premium</span>
                <h3>LoungeKey</h3>
                <p>Gidiş-dönüşte salon. Misafir hakkın pakete göre artar.</p>
              </article>
              <article className="life-card c">
                <span>Tüm hesaplar</span>
                <h3>Anında dondur</h3>
                <p>Kart kaybolduysa uygulamadan kapat. Sanal kart 30 saniyede yenilenir.</p>
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
            Paketsiz hesap · Standard · Plus · Premium
          </span>
        </div>
      </footer>

      {modal && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <form className="modal-card" onSubmit={submit}>
            <button type="button" className="modal-close" onClick={closeModal} aria-label="Kapat">
              ×
            </button>
            <h3 id="signup-title">
              {intent === 'account' ? 'Paketsiz hesap aç' : `${selectedPlan?.name ?? 'Paket'} paketini ekle`}
            </h3>
            <p>
              {intent === 'account'
                ? 'Paket seçmeden, 0 ₺’ye hesap için sıraya yazıl. Adını ve e-postanı bırakman yeterli.'
                : `Adını ve e-postanı bırak; lansmanda ${selectedPlan?.name ?? 'paket'} kotasından yer ayıralım. Hesap yine paketsiz de açılabilir.`}
            </p>
            <label htmlFor="full-name">Ad soyad</label>
            <input id="full-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Yılmaz" />
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ada@email.com"
            />
            {error && <p style={{ color: '#b42318', marginBottom: 0 }}>{error}</p>}
            <div className="modal-actions">
              <button type="submit" className="btn btn-solid">
                Kaydı tamamla
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Vazgeç
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button type="button" className="toast-close" onClick={closeToast} aria-label="Kapat">
            ×
          </button>
        </div>
      )}
    </div>
  )
}
