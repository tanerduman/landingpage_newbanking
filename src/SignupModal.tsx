import { useEffect, useState, type FormEvent } from 'react'
import { plans } from './plans.ts'
import { addWaitlistEntry, fetchCaptcha, type SignupIntent } from './waitlist'

export function SignupModal({ intent, onClose }: { intent: SignupIntent; onClose: (toast?: string) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaQuestion, setCaptchaQuestion] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const plan = plans.find((p) => p.id === intent)

  async function loadCaptcha() {
    setCaptchaAnswer('')
    try {
      const next = await fetchCaptcha()
      setCaptchaToken(next.token)
      setCaptchaQuestion(next.question)
    } catch (err) {
      setCaptchaToken('')
      setCaptchaQuestion('')
      setError(err instanceof Error ? err.message : 'Güvenlik sorusu yüklenemedi.')
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    void loadCaptcha()
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) {
      setError('Lütfen adını yaz.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Geçerli bir e-posta gir.')
      return
    }
    if (!captchaToken || !captchaAnswer.trim()) {
      setError('Güvenlik sorusunu yanıtla.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await addWaitlistEntry({ name, email, intent, captchaToken, captchaAnswer })
      onClose(
        intent === 'account'
          ? 'Paketsiz hesabın için sıraya alındın.'
          : `${plan?.name ?? 'Paket'} için sıraya alındın.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt alınamadı.')
      await loadCaptcha()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="modal-card" onSubmit={submit}>
        <button type="button" className="modal-close" onClick={() => onClose()} aria-label="Kapat">
          ×
        </button>
        <h3 id="signup-title">
          {intent === 'account' ? 'Paketsiz hesap aç' : `${plan?.name ?? 'Paket'} paketini ekle`}
        </h3>
        <p>
          {intent === 'account'
            ? 'Paket seçmeden, 0 ₺’ye hesap için sıraya yazıl. Adını ve e-postanı bırakman yeterli.'
            : `Adını ve e-postanı bırak; lansmanda ${plan?.name ?? 'paket'} kotasından yer ayıralım. Hesap yine paketsiz de açılabilir.`}
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
        <label htmlFor="captcha-answer">Güvenlik sorusu</label>
        <div className="captcha-row">
          <span className="captcha-q" aria-hidden="true">
            {captchaQuestion || '…'} = ?
          </span>
          <input
            id="captcha-answer"
            inputMode="numeric"
            autoComplete="off"
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
            placeholder="Sonuç"
            aria-label={captchaQuestion ? `${captchaQuestion} kaç eder?` : 'Güvenlik sorusu'}
          />
          <button type="button" className="btn btn-ghost captcha-refresh" onClick={() => void loadCaptcha()}>
            Yenile
          </button>
        </div>
        {error && (
          <p className="login-error" style={{ marginBottom: 0 }}>
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="submit" className="btn btn-solid" disabled={busy || !captchaToken}>
            Kaydı tamamla
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onClose()}>
            Vazgeç
          </button>
        </div>
      </form>
    </div>
  )
}

export function SignupToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const timer = window.setTimeout(onClose, 3200)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(timer)
    }
  }, [onClose])

  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Kapat">
        ×
      </button>
    </div>
  )
}
