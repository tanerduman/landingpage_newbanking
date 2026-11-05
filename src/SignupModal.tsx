import { useEffect, useState, type FormEvent } from 'react'
import { plans } from './plans.ts'
import { addWaitlistEntry, confirmWaitlist, fetchCaptcha, type SignupIntent } from './waitlist'

export function SignupModal({ intent, onClose }: { intent: SignupIntent; onClose: (toast?: string) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaQuestion, setCaptchaQuestion] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'form' | 'code'>('form')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState('')
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
    if (phase === 'code') {
      if (!/^\d{6}$/.test(code.trim())) {
        setError('E-postadaki 6 haneli kodu yaz.')
        return
      }
      setBusy(true)
      setError('')
      try {
        await confirmWaitlist({ email, code })
        onClose(
          intent === 'account'
            ? 'E-posta onaylandı. Paketsiz hesabın sırada.'
            : `E-posta onaylandı. ${plan?.name ?? 'Paket'} sırada.`,
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Onay başarısız.')
      } finally {
        setBusy(false)
      }
      return
    }
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
      const result = await addWaitlistEntry({ name, email, intent, captchaToken, captchaAnswer })
      if (result.status === 'updated') {
        onClose('Bu e-posta zaten onaylı; paket tercihin güncellendi.')
        return
      }
      setDevCode(result.devCode || '')
      setPhase('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt alınamadı.')
      if (phase === 'form') await loadCaptcha()
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
          {phase === 'code'
            ? 'E-postanı onayla'
            : intent === 'account'
              ? 'Paketsiz hesap aç'
              : `${plan?.name ?? 'Paket'} paketini ekle`}
        </h3>
        {phase === 'form' ? (
          <>
            <p>
              {intent === 'account'
                ? 'Kayıt e-posta onayından sonra waitlist’e düşer. Adını ve e-postanı bırak.'
                : `Adını ve e-postanı bırak. Onay linki veya kod gelmeden ${plan?.name ?? 'paket'} talebi listeye yazılmaz.`}
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
          </>
        ) : (
          <>
            <p>
              {email} adresine 6 haneli kod ve onay bağlantısı gönderdik. Listeye ancak onaydan sonra düşersin.
            </p>
            <label htmlFor="confirm-code">Onay kodu</label>
            <input
              id="confirm-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
            {devCode ? <p className="captcha-dev">Geliştirme kodu: {devCode}</p> : null}
          </>
        )}
        {error && (
          <p className="login-error" style={{ marginBottom: 0 }}>
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="submit" className="btn btn-solid" disabled={busy || (phase === 'form' && !captchaToken)}>
            {phase === 'code' ? 'Onayla' : 'Kodu gönder'}
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
