export type ApiLocale = 'tr' | 'en'

const errors: Record<ApiLocale, Record<string, string>> = {
  tr: {
    too_big: 'İstek çok büyük.',
    bad_json: 'Geçersiz JSON.',
    too_many: 'Çok fazla istek.',
    bad_visit: 'Geçersiz ziyaret.',
    mail_fail: 'Onay e-postası gönderilemedi. Az sonra tekrar dene.',
    mail_off: 'E-posta servisi henüz bağlanmadı.',
    confirm_need: 'Onay kodu veya bağlantı gerekli.',
    email_need: 'E-posta gerekli.',
    server: 'Sunucu hatası.',
    not_found: 'Bulunamadı.',
    invalid: 'Geçersiz istek.',
    name: 'Lütfen adını yaz.',
    email: 'Geçerli bir e-posta gir.',
    intent: 'Geçersiz paket.',
    cycle: 'Geçersiz ödeme dönemi.',
    confirm_invalid: 'Onay kodu veya bağlantı geçersiz.',
  },
  en: {
    too_big: 'Request too large.',
    bad_json: 'Invalid JSON.',
    too_many: 'Too many requests.',
    bad_visit: 'Invalid visit.',
    mail_fail: 'Could not send the confirmation email. Try again shortly.',
    mail_off: 'Email is not connected yet.',
    confirm_need: 'A confirmation code or link is required.',
    email_need: 'Email is required.',
    server: 'Server error.',
    not_found: 'Not found.',
    invalid: 'Invalid request.',
    name: 'Please enter your name.',
    email: 'Enter a valid email.',
    intent: 'Invalid plan.',
    cycle: 'Invalid billing period.',
    confirm_invalid: 'The confirmation code or link is invalid.',
  },
}

export function parseLocale(value: unknown): ApiLocale {
  return value === 'en' ? 'en' : 'tr'
}

export function localeFromRequest(request: Request, body?: unknown) {
  if (body && typeof body === 'object' && 'lang' in body) {
    return parseLocale((body as { lang?: unknown }).lang)
  }
  const header = request.headers.get('accept-language') || ''
  if (header.toLowerCase().startsWith('en')) return 'en'
  return 'tr'
}

export function apiError(code: string, locale: ApiLocale) {
  return errors[locale][code] || errors[locale].invalid
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

export function confirmMailCopy(locale: ApiLocale, code: string, link: string) {
  const safeCode = escapeHtml(code)
  const safeLink = escapeHtml(link)
  if (locale === 'en') {
    return {
      subject: 'Confirm your AURE request',
      text: `Your confirmation code: ${code}\n\nOr open this link:\n${link}\n\nThe code is valid for 30 minutes.`,
      html: `<p>Use this code to confirm your AURE waitlist request:</p>
<p style="font-size:28px;letter-spacing:0.12em;font-weight:700">${safeCode}</p>
<p><a href="${safeLink}">Confirmation link</a> — valid for 30 minutes.</p>`,
    }
  }
  return {
    subject: 'AURE talep onayın',
    text: `Talebini onaylamak için kod: ${code}\n\nVeya bu bağlantıya tıkla:\n${link}\n\nKod 30 dakika geçerli.`,
    html: `<p>AURE waitlist talebini onaylamak için kodun:</p>
<p style="font-size:28px;letter-spacing:0.12em;font-weight:700">${safeCode}</p>
<p><a href="${safeLink}">Onay bağlantısı</a> — 30 dakika geçerli.</p>`,
  }
}
