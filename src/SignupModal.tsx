import { useEffect, useState, type FormEvent } from 'react'
import { plans } from './plans.ts'
import { addWaitlistEntry, type SignupIntent } from './waitlist'

export function SignupModal({ intent, onClose }: { intent: SignupIntent; onClose: (toast?: string) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const plan = plans.find((p) => p.id === intent)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
    await addWaitlistEntry({ name, email, intent })
    onClose(
      intent === 'account'
        ? 'Paketsiz hesabın için sıraya alındın.'
        : `${plan?.name ?? 'Paket'} için sıraya alındın.`,
    )
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
        {error && <p style={{ color: '#b42318', marginBottom: 0 }}>{error}</p>}
        <div className="modal-actions">
          <button type="submit" className="btn btn-solid">
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
