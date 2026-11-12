import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { withBase } from './base.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import LogoMark from './LogoMark.tsx'

type Prompt = { q: string; a: string; keys: string[] }
type Turn = { role: 'user' | 'bot'; text: string; link?: string }

function fold(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function words(value: string) {
  return fold(value)
    .split(' ')
    .filter((word) => word.length > 2)
}

function findPrompt(text: string, prompts: readonly Prompt[]) {
  const asked = fold(text)
  const direct = prompts.find((prompt) => fold(prompt.q) === asked)
  if (direct) return direct

  const tokens = new Set(words(text))
  let best: Prompt | null = null
  let bestScore = 0

  for (const prompt of prompts) {
    let score = 0
    for (const key of prompt.keys) {
      const folded = fold(key)
      if (!folded) continue
      if (folded.includes(' ')) {
        if (asked.includes(folded)) score += 3
        continue
      }
      if (folded.length < 3) continue
      if (tokens.has(folded)) score += 2
    }
    for (const word of words(prompt.q)) {
      if (tokens.has(word)) score += 1
    }
    if (score > bestScore) {
      best = prompt
      bestScore = score
    }
  }

  return bestScore >= 2 ? best : null
}

export default function HomeGuide() {
  const { t, locale } = useI18n()
  const titleId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const launchRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [record, setRecord] = useState<{ id: number; locale: typeof locale; items: Turn[]; pending: boolean }>({
    id: 0,
    locale,
    items: [],
    pending: false,
  })
  const prompts = t.chat.prompts
  const active = record.locale === locale
  const turns = active ? record.items : []
  const pending = active && record.pending
  const asked = new Set(turns.filter((turn) => turn.role === 'user').map((turn) => turn.text))

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        launchRef.current?.focus()
      }
    }
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  useEffect(() => {
    const log = logRef.current
    if (!log) return
    log.scrollTop = log.scrollHeight
  }, [record, open])

  function ask(text: string) {
    const clean = text.trim()
    if (!clean || pending) return
    const hit = findPrompt(clean, prompts)
    const reply = hit ? hit.a : t.chat.miss
    const link = hit ? undefined : t.chat.missLink
    const nextId = record.locale === locale ? record.id : record.id + 1
    const items = record.locale === locale ? record.items : []
    setDraft('')
    setRecord({
      id: nextId,
      locale,
      pending: true,
      items: [...items, { role: 'user', text: clean }],
    })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setRecord((prev) => {
        if (prev.id !== nextId || prev.locale !== locale) return prev
        return {
          ...prev,
          pending: false,
          items: [...prev.items, { role: 'bot', text: reply, link }],
        }
      })
    }, 700)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    ask(draft)
  }

  function reset() {
    window.clearTimeout(timer.current)
    setRecord((prev) => ({ id: prev.id + 1, locale, items: [], pending: false }))
    setDraft('')
    inputRef.current?.focus()
  }

  return createPortal(
    <div className="guide" ref={rootRef}>
      {open && (
        <section className="guide-panel" id="home-guide" role="dialog" aria-labelledby={titleId}>
          <header className="guide-head">
            <div className="guide-id">
              <LogoMark className="guide-mark" />
              <div>
                <strong id={titleId}>{t.chat.title}</strong>
                <small>
                  <span className="guide-status" />
                  {t.chat.status}
                </small>
              </div>
            </div>
            <button
              type="button"
              className="guide-close"
              aria-label={t.chat.close}
              onClick={() => {
                setOpen(false)
                launchRef.current?.focus()
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="guide-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions">
            <p className="guide-msg guide-msg-bot">{t.chat.welcome}</p>
            {turns.map((turn, index) => (
              <p key={`${turn.role}-${index}`} className={`guide-msg guide-msg-${turn.role}`}>
                {turn.text}
                {turn.link && (
                  <a className="guide-link" href={withBase('support')}>
                    {turn.link}
                  </a>
                )}
              </p>
            ))}
            {pending && (
              <p className="guide-msg guide-msg-bot guide-typing" aria-label={t.chat.typing}>
                <span />
                <span />
                <span />
              </p>
            )}
          </div>

          <div className="guide-chips" role="group" aria-label={t.chat.suggestions}>
            {prompts.map((prompt) => (
              <button
                key={prompt.q}
                type="button"
                className={asked.has(prompt.q) ? 'guide-chip is-asked' : 'guide-chip'}
                disabled={pending}
                onClick={() => ask(prompt.q)}
              >
                {prompt.q}
              </button>
            ))}
          </div>

          {turns.length > 0 && (
            <button type="button" className="guide-reset" onClick={reset}>
              {t.chat.reset}
            </button>
          )}

          <form className="guide-form" onSubmit={submit}>
            <input
              ref={inputRef}
              value={draft}
              maxLength={240}
              autoComplete="off"
              enterKeyHint="send"
              placeholder={t.chat.placeholder}
              aria-label={t.chat.placeholder}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="guide-send" disabled={pending || draft.trim().length === 0} aria-label={t.chat.send}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </section>
      )}

      <button
        ref={launchRef}
        type="button"
        className="guide-launch"
        aria-expanded={open}
        aria-controls="home-guide"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 16.5H9l-3.5 3v-3H5A1.5 1.5 0 0 1 3.5 15V8A1.5 1.5 0 0 1 5 6.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        {open ? t.chat.close : t.chat.open}
      </button>
    </div>,
    document.body,
  )
}
