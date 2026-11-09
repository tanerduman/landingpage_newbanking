import { confirmMailCopy } from './i18n.ts'

export function normalizeEmail(email: string) {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at < 1) return trimmed
  let local = trimmed.slice(0, at)
  let domain = trimmed.slice(at + 1)
  if (domain === 'googlemail.com') domain = 'gmail.com'
  const plus = local.indexOf('+')
  if (plus !== -1) local = local.slice(0, plus)
  if (domain === 'gmail.com') local = local.replaceAll('.', '')
  return `${local}@${domain}`
}

export function isProduction() {
  return process.env.VERCEL_ENV === 'production'
}

export async function sendWaitlistConfirm(input: {
  to: string
  code: string
  link: string
  locale: 'tr' | 'en'
  purpose?: 'waitlist' | 'support'
}) {
  const key = process.env.RESEND_API_KEY || ''
  const from = process.env.MAIL_FROM || 'AURE <onboarding@resend.dev>'
  if (!key) return { ok: false as const, skipped: true as const }
  const copy = confirmMailCopy(input.locale, input.code, input.link, input.purpose || 'waitlist')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: copy.subject,
      text: copy.text,
      html: copy.html,
    }),
  })
  if (!res.ok) return { ok: false as const, skipped: false as const }
  return { ok: true as const, skipped: false as const }
}

export function publicAppUrl(request: Request) {
  const envUrl = (process.env.APP_URL || '').replace(/\/+$/, '')
  if (envUrl) return envUrl
  const origin = request.headers.get('origin')
  if (origin) return origin.replace(/\/+$/, '')
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  if (host) return `${proto}://${host}`
  return 'https://getaure.org'
}
