import { useCallback, useEffect, useRef, useState } from 'react'

const LISTEN_MS = 60_000

type SpeechResult = {
  isFinal: boolean
  0?: { transcript: string }
}

type SpeechResultEvent = {
  results: ArrayLike<SpeechResult>
}

type SpeechErrorEvent = {
  error: string
}

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: SpeechResultEvent) => void) | null
  onerror: ((event: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
}

type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const host = window as Window & {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

function joinSpeech(base: string, spoken: string, maxLength: number) {
  const extra = spoken.trim()
  if (!extra) return base.slice(0, maxLength)
  const gap = base.length > 0 && !/\s$/.test(base) ? ' ' : ''
  return (base + gap + extra).slice(0, maxLength)
}

export function useSpeechDraft({
  lang,
  value,
  onChange,
  maxLength,
  onBlocked,
}: {
  lang: string
  value: string
  onChange: (value: string) => void
  maxLength: number
  onBlocked: () => void
}) {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => recognitionCtor() !== null)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const onBlockedRef = useRef(onBlocked)
  const langRef = useRef(lang)
  const maxRef = useRef(maxLength)
  const recognitionRef = useRef<Recognition | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    valueRef.current = value
    onChangeRef.current = onChange
    onBlockedRef.current = onBlocked
    langRef.current = lang
    maxRef.current = maxLength
  })

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clearTimer()
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    try {
      recognition.stop()
    } catch {
      /* already stopped */
    }
    setListening(false)
  }, [clearTimer])

  const start = useCallback(() => {
    const Ctor = recognitionCtor()
    if (!Ctor || recognitionRef.current) return
    const recognition = new Ctor()
    const base = valueRef.current
    recognition.lang = langRef.current
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let finals = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result?.[0]?.transcript ?? ''
        if (result?.isFinal) finals += transcript
        else interim += transcript
      }
      const next = joinSpeech(base, finals + interim, maxRef.current)
      onChangeRef.current(next)
      if (next.length >= maxRef.current) recognition.stop()
    }
    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      onBlockedRef.current()
    }
    recognition.onend = () => {
      clearTimer()
      if (recognitionRef.current === recognition) recognitionRef.current = null
      setListening(false)
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      onBlockedRef.current()
      return
    }
    setListening(true)
    timerRef.current = window.setTimeout(() => recognition.stop(), LISTEN_MS)
  }, [clearTimer])

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop()
    else start()
  }, [start, stop])

  return { supported, listening, toggle, stop }
}
