import { useMemo, useState, type FormEvent } from 'react'

type PlanId = 'standard' | 'plus' | 'premium' | 'metal'
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
    blurb: 'Günlük harcama için giriş üyeliği.',
    perks: ['Sanal ve fiziksel kart dahil', 'Anlık bildirimler', '1.000 €/ay ücretsiz ATM', 'Hafta içi piyasa kuruna yakın döviz'],
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
  {
    id: 'metal',
    name: 'Metal',
    monthly: 449,
    blurb: 'Nakit iade ve concierge ile tam üyelik.',
    perks: ['%1 nakit iade', 'Özel metal kart', '24/7 concierge', 'Kiralık araç ve cihaz sigortası'],
  },
]

const comparison = [
  { label: 'Aylık üyelik', values: ['49 ₺', '99 ₺', '249 ₺', '449 ₺'] },
  { label: 'Fiziksel kart', values: ['Plastik', 'Plus kart', 'Premium kart', 'Metal kart'] },
  { label: 'Ücretsiz döviz', values: ['1.000 €/ay', '3.000 €/ay', 'Sınırsız', 'Sınırsız'] },
  { label: 'ATM çekimi', values: ['1.000 €/ay', '3.000 €/ay', '800 €/ay yurtdışı', '2.000 €/ay yurtdışı'] },
  { label: 'Seyahat sigortası', values: [false, false, true, true] },
  { label: 'Lounge erişimi', values: [false, false, '2 misafir', '4 misafir'] },
  { label: 'Nakit iade', values: [false, false, false, '%1'] },
  { label: 'Concierge', values: [false, false, false, true] },
]

const faqs = [
  {
    q: 'AURE bir banka mı?',
    a: 'AURE, elektronik para kuruluşu lisansı modeliyle çalışan kurgusal bir neo-banka deneyimidir. Gerçek para yatırma veya hesap açma işlemi yapılmaz; bu sayfa ürün ve üyelik modelini göstermek için tasarlandı.',
  },
  {
    q: 'İstediğim zaman plan değiştirebilir miyim?',
    a: 'Evet. Standard’dan Metal’e anında yükseltebilir, dönem sonunda daha düşük bir plana inebilirsin. Yıllık planda kalan günler sonraki faturaya kredi olarak yansır.',
  },
  {
    q: 'Döviz ücreti nasıl işler?',
    a: 'Hafta içi piyasa kuruna yakın fiyatlanır. Standard ve Plus’ta aylık ücretsiz döviz limiti vardır; limiti aşınca küçük bir makas uygulanır. Premium ve Metal’de döviz limitsiz ve ücretsizdir.',
  },
  {
    q: 'Kartımı yurtdışında kullanabilir miyim?',
    a: 'Tüm planlarda Mastercard/Visa altyapısıyla yurtdışı harcama açıktır. ATM ve döviz limitleri plana göre değişir; seyahat sigortası Premium ve Metal’de dahildir.',
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
  const [selected, setSelected] = useState<PlanId>('premium')
  const [faq, setFaq] = useState<number | null>(0)
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const period = cycle === 'yearly' ? '/yıl' : '/ay'
  const selectedPlan = useMemo(() => plans.find((p) => p.id === selected)!, [selected])

  function openSignup() {
    setError('')
    setModal(true)
  }

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
    setModal(false)
    setToast(`${selectedPlan.name} planı için sıraya alındın.`)
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
            <a href="#plans">Planlar</a>
            <a href="#features">Özellikler</a>
            <a href="#compare">Karşılaştır</a>
            <a href="#faq">SSS</a>
          </nav>
          <div className="nav-cta">
            <a className="btn btn-ghost" href="#compare">
              Planları karşılaştır
            </a>
            <button className="btn btn-solid" onClick={openSignup}>
              Hesap aç
            </button>
            <button className="menu-btn" aria-label="Menü" onClick={() => setMenu((v) => !v)}>
              ☰
            </button>
          </div>
        </div>
        <div className={`wrap mobile-drawer ${menu ? 'open' : ''}`}>
          <a href="#plans" onClick={() => setMenu(false)}>
            Planlar
          </a>
          <a href="#features" onClick={() => setMenu(false)}>
            Özellikler
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
              <span className="dot" /> 40+ para birimi · tek uygulama
            </div>
            <h1>Paran, her yerde daha güçlü.</h1>
            <p className="lead">
              Revolut tarzı üyelik katmanları: ücretli Standard’dan Metal’e. Döviz, kart, birikim, seyahat ve yatırımı
              tek bakiyede tut; ihtiyacın kadar öde.
            </p>
            <div className="hero-actions">
              <button className="btn btn-solid" onClick={openSignup}>
                Standard ile başla
              </button>
              <a className="btn btn-ghost" href="#plans">
                {selectedPlan.name} planını incele
              </a>
            </div>
            <div className="stats">
              <div>
                <strong>4</strong>
                <span>üyelik katmanı</span>
              </div>
              <div>
                <strong>49 ₺</strong>
                <span>Standard / ay</span>
              </div>
              <div>
                <strong>150+</strong>
                <span>ülkede harcama</span>
              </div>
            </div>
          </div>

          <div className={`stage is-${selected}`}>
            <div className="card-stack" aria-hidden="true">
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
              <article className="bank-card card-metal">
                <span className="chip" />
                <div>
                  <small>AURE Metal</small>
                  <b>•••• 7740</b>
                </div>
              </article>
            </div>
            <div className="float-pill pill-fx">
              <strong>EUR → TRY</strong>
              Piyasa kuru · makas yok
            </div>
            <div className="float-pill pill-atm">
              <strong>ATM</strong>
              Plana göre ücretsiz çekim
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
            <div className="section-head">
              <div>
                <h2>Üyeliğini seç, limiti yükselt.</h2>
              </div>
              <div>
                <p>Aylık öde veya yıllık planda 2 ay bizden olsun. İstediğin an durdur.</p>
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
                <button
                  key={plan.id}
                  className={`plan-card ${plan.featured ? 'featured' : ''} ${selected === plan.id ? 'selected' : ''}`}
                  onClick={() => setSelected(plan.id)}
                >
                  <div className="plan-kicker">
                    {plan.featured ? 'En çok seçilen' : 'Üyelik'}
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
                  <span className={`btn ${plan.featured ? 'btn-solid' : 'btn-ghost'}`} onClick={openSignup}>
                    Bu planı seç
                  </span>
                </button>
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
                Klasik hesap + kart değil: günlük nakit, döviz cüzdanları, kasa ve yatırım aynı yerde. Üyelik yükseldikçe
                limitler, sigorta ve lounge gibi yaşam ayrıcalıkları açılır.
              </p>
            </div>
            <div className="feature-grid">
              <article className="feature-tile">
                <div className="icon">Fx</div>
                <h3>Döviz</h3>
                <p>Hafta içi piyasa kuruna yakın çevir. Premium ve Metal’de makas yok.</p>
              </article>
              <article className="feature-tile">
                <div className="icon">%</div>
                <h3>Kasa</h3>
                <p>Günlük faizlenen kasalar ve turuncu birikim hedefleri.</p>
              </article>
              <article className="feature-tile">
                <div className="icon">↑</div>
                <h3>Yatırım</h3>
                <p>Hisse ve kripto. Üyelikle komisyon düşer, anlık al-sat açılır.</p>
              </article>
              <article className="feature-tile">
                <div className="icon">✈</div>
                <h3>Seyahat</h3>
                <p>Sigorta, lounge ve yurtdışı ATM. Kartını uçağa binmeden önce dondur.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="compare" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="section-head">
              <h2>Planları yan yana gör.</h2>
              <p>Revolut’taki Standard / Plus / Premium / Metal mantığının AURE karşılığı.</p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Özellik</th>
                    {plans.map((p) => (
                      <th key={p.id} className="center">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {row.values.map((value, i) => (
                        <td key={plans[i].id} className="center">
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
              <h2>Üyelik, sadece kart rengi değil.</h2>
              <p>Premium ve Metal; sigorta, lounge ve concierge ile seyahati hesaba bağlar.</p>
            </div>
            <div className="lifestyle">
              <article className="life-card a">
                <span>Metal</span>
                <h3>%1 nakit iade</h3>
                <p>Uçuş, restoran ve günlük harcamada. Üst sınır yok, puan değil gerçek bakiye.</p>
              </article>
              <article className="life-card b">
                <span>Premium</span>
                <h3>LoungeKey</h3>
                <p>Gidiş-dönüşte salon. Misafir hakkın plana göre artar.</p>
              </article>
              <article className="life-card c">
                <span>Tüm planlar</span>
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
              <h2>Önce Standard. Sonra ihtiyacın kadar.</h2>
              <p>Giriş üyeliği 49 ₺/ay. Kartın dakikalar içinde uygulamada; Metal’e yükseltince fiziksel kart yeniden basılır.</p>
            </div>
            <button className="btn btn-dark" onClick={openSignup}>
              Bekleme listesine yazıl
            </button>
          </div>
        </div>
      </main>

      <footer>
        <div className="wrap foot">
          <span>© 2026 AURE. Kurgusal ürün — gerçek bankacılık hizmeti sunmaz.</span>
          <span>Standard · Plus · Premium · Metal</span>
        </div>
      </footer>

      {modal && (
        <div className="modal" role="dialog" aria-labelledby="signup-title">
          <form className="modal-card" onSubmit={submit}>
            <h3 id="signup-title">{selectedPlan.name} ile başla</h3>
            <p>Adını ve e-postanı bırak; lansmanda {selectedPlan.name} kotasından yer ayıralım.</p>
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
              <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>
                Vazgeç
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
