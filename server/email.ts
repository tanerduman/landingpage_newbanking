import { confirmMailCopy, receiptMailCopy, type ReceiptInput } from './i18n.ts'

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

export type VisitScope = 'production' | 'preview' | 'development'

/** Preview deployments keep their own visitor counts, separate from production. */
export function visitScope(): VisitScope {
  if (process.env.VERCEL_ENV === 'preview') return 'preview'
  if (process.env.VERCEL_ENV === 'production') return 'production'
  return 'development'
}

const CANONICAL_PRODUCTION_URL = 'https://www.getaure.org'

function stripSlash(url: string) {
  return url.replace(/\/+$/, '')
}

async function postResend(mail: { to: string; subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY || ''
  const from = process.env.MAIL_FROM || 'AURE <onboarding@resend.dev>'
  if (!key) return { ok: false as const, skipped: true as const }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 400)
      console.error(`resend send failed ${res.status} ${detail}`)
      return { ok: false as const, skipped: false as const }
    }
    return { ok: true as const, skipped: false as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network'
    console.error(`resend send failed ${message}`)
    return { ok: false as const, skipped: false as const }
  }
}

export async function sendWaitlistConfirm(input: {
  to: string
  code: string
  link: string
  locale: 'tr' | 'en'
  purpose?: 'waitlist' | 'support'
}) {
  const copy = confirmMailCopy(input.locale, input.code, input.link, input.purpose || 'waitlist')
  return postResend({ to: input.to, subject: copy.subject, text: copy.text, html: copy.html })
}

/** Informational note after a correct OTP. Uses the same Resend key and sender as the code mail. */
export async function sendRequestReceipt(input: { to: string; locale: 'tr' | 'en'; detail: ReceiptInput }) {
  const copy = receiptMailCopy(input.locale, input.detail)
  return postResend({ to: input.to, subject: copy.subject, text: copy.text, html: copy.html })
}

export function publicAppUrl(_request?: Request) {
  const envUrl = stripSlash(process.env.APP_URL || '')
  if (envUrl) return envUrl
  if (isProduction()) return CANONICAL_PRODUCTION_URL
  const vercelUrl = stripSlash(process.env.VERCEL_URL || '')
  if (vercelUrl) return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`
  return 'http://127.0.0.1:5173'
}
