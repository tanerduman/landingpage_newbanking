import { useEffect, useRef, useState, type FormEvent } from 'react'
import { plans } from './plans.ts'
import {
  addWaitlistEntry,
  confirmWaitlist,
  fetchConfirmStatus,
  onWaitlistConfirmed,
  type BillingCycle,
  type SignupIntent,
} from './waitlist'

export function SignupModal({
  intent,
  cycle = 'monthly',
  onClose,
}: {
  intent: SignupIntent
  cycle?: BillingCycle
  onClose: (toast?: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'form' | 'code'>('form')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState('')
  const [billing, setBilling] = useState<BillingCycle>(intent === 'account' ? 'none' : cycle)
  const plan = plans.find((p) => p.id === intent)
  const successToast =
    intent === 'account'
      ? 'Talebiniz onaylandı. Paketsiz hesabınız waitlist’te.'
      : `Talebiniz onaylandı. ${plan?.name ?? 'Paket'} waitlist’e eklendi.`
  const onCloseRef = useRef(onClose)
  const finishedRef = useRef(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (phase !== 'code' || !email) return
    finishedRef.current = false
    function finish() {
      if (finishedRef.current) return
      finishedRef.current = true
      onCloseRef.current(successToast)
    }
    const stop = onWaitlistConfirmed(email, finish)
    const timer = window.setInterval(() => {
      void fetchConfirmStatus(email).then((confirmed) => {
        if (confirmed) finish()
      })
    }, 2500)
    void fetchConfirmStatus(email).then((confirmed) => {
      if (confirmed) finish()
    })
    return () => {
      finishedRef.current = true
      stop()
      window.clearInterval(timer)
    }
  }, [phase, email, successToast])

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
        onClose(successToast)
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
    setBusy(true)
    setError('')
    try {
      const result = await addWaitlistEntry({
        name,
        email,
        intent,
        cycle: intent === 'account' ? 'none' : billing === 'yearly' ? 'yearly' : 'monthly',
      })
      if (result.status === 'updated') {
        onClose('Bu e-posta zaten onaylı; paket tercihin güncellendi.')
        return
      }
      setDevCode(result.devCode || '')
      setPhase('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt alınamadı.')
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
            {intent !== 'account' && (
              <>
                <label>Ödeme dönemi</label>
                <div className="toggle" role="tablist" aria-label="Ödeme dönemi">
                  <button
                    type="button"
                    className={billing !== 'yearly' ? 'active' : ''}
                    onClick={() => setBilling('monthly')}
                  >
                    Aylık
                  </button>
                  <button
                    type="button"
                    className={billing === 'yearly' ? 'active' : ''}
                    onClick={() => setBilling('yearly')}
                  >
                    Yıllık <span className="save-tag">2 ay bedava</span>
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <p>
              {email} adresine 6 haneli kod ve onay bağlantısı gönderdik. Bağlantıya tıklarsan bu pencere kapanır;
              kodu buraya da yazabilirsin.
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
            {devCode ? <p className="confirm-dev">Geliştirme kodu: {devCode}</p> : null}
          </>
        )}
        {error && (
          <p className="login-error" style={{ marginBottom: 0 }}>
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="submit" className="btn btn-solid" disabled={busy}>
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
    const timer = window.setTimeout(onClose, 4500)
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
