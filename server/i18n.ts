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
    message: 'Açıklamayı biraz daha açık yaz.',
    kind: 'Talep türünü seç.',
    intent: 'Geçersiz paket.',
    cycle: 'Geçersiz ödeme dönemi.',
    confirm_invalid: 'Onay kodu veya bağlantı geçersiz.',
    unauthorized: 'Oturum gerekli.',
    auth_need: 'Kullanıcı adı ve şifre gerekli.',
    auth_bad: 'Kullanıcı adı veya şifre hatalı.',
    auth_off: 'Waitlist girişi henüz bağlanmadı.',
    bot: 'İstek doğrulanamadı. Sayfayı yenileyip tekrar dene.',
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
    message: 'Write a little more in the description.',
    kind: 'Choose a request type.',
    intent: 'Invalid plan.',
    cycle: 'Invalid billing period.',
    confirm_invalid: 'The confirmation code or link is invalid.',
    unauthorized: 'Sign in required.',
    auth_need: 'Username and password are required.',
    auth_bad: 'Wrong username or password.',
    auth_off: 'Waitlist login is not connected yet.',
    bot: 'The request could not be verified. Refresh the page and try again.',
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

function oneLine(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

const PLAN_LABEL: Record<ApiLocale, Record<string, string>> = {
  tr: { account: 'Temel', standard: 'Standard', plus: 'Plus', premium: 'Premium' },
  en: { account: 'Basic', standard: 'Standard', plus: 'Plus', premium: 'Premium' },
}

const CYCLE_LABEL: Record<ApiLocale, Record<string, string>> = {
  tr: { monthly: 'Aylık', yearly: 'Yıllık' },
  en: { monthly: 'Monthly', yearly: 'Yearly' },
}

const KIND_LABEL: Record<ApiLocale, Record<string, string>> = {
  tr: { complaint: 'Şikayet', suggestion: 'Öneri', support: 'Destek' },
  en: { complaint: 'Complaint', suggestion: 'Suggestion', support: 'Support' },
}

export type ReceiptInput =
  | { purpose: 'waitlist'; name: string; intent: string; cycle: string }
  | { purpose: 'support'; name: string; kind: string; message: string }

function labeled(map: Record<string, string>, key: string) {
  return map[key] || key
}

/** Sent after the OTP checks out. It describes the request and carries no code. */
export function receiptMailCopy(locale: ApiLocale, input: ReceiptInput) {
  const name = escapeHtml(oneLine(input.name))
  const hello = locale === 'en' ? `Hello ${name},` : `Merhaba ${name},`
  if (input.purpose === 'support') {
    const kind = escapeHtml(labeled(KIND_LABEL[locale], input.kind))
    const message = escapeHtml(input.message.trim())
    if (locale === 'en') {
      return {
        subject: 'Your AURE support note is on the list',
        text: `Hello ${oneLine(input.name)},\n\nYour code checked out. The support note is on the list.\n\nType: ${labeled(KIND_LABEL.en, input.kind)}\nMessage:\n${input.message.trim()}`,
        html: `<p>${hello}</p>
<p>Your code checked out. The support note is on the list.</p>
<p>Type: ${kind}</p>
<p style="white-space:pre-wrap">${message}</p>`,
      }
    }
    return {
      subject: 'AURE destek kaydın listede',
      text: `Merhaba ${oneLine(input.name)},\n\nOnay kodun doğrulandı. Destek kaydın listeye eklendi.\n\nTür: ${labeled(KIND_LABEL.tr, input.kind)}\nAçıklama:\n${input.message.trim()}`,
      html: `<p>${hello}</p>
<p>Onay kodun doğrulandı. Destek kaydın listeye eklendi.</p>
<p>Tür: ${kind}</p>
<p style="white-space:pre-wrap">${message}</p>`,
    }
  }
  const plan = labeled(PLAN_LABEL[locale], input.intent)
  const cycle = CYCLE_LABEL[locale][input.cycle] || ''
  const safePlan = escapeHtml(plan)
  const safeCycle = escapeHtml(cycle)
  const periodText = cycle ? (locale === 'en' ? `Period: ${cycle}\n` : `Dönem: ${cycle}\n`) : ''
  const periodHtml = cycle ? `<br>${locale === 'en' ? 'Period' : 'Dönem'}: ${safeCycle}` : ''
  if (locale === 'en') {
    return {
      subject: 'Your AURE request is on the waitlist',
      text: `Hello ${oneLine(input.name)},\n\nYour code checked out. The request is on the waitlist.\n\nPlan: ${plan}\n${periodText}\nWe are not opening accounts yet. The request stays on the waitlist.`,
      html: `<p>${hello}</p>
<p>Your code checked out. The request is on the waitlist.</p>
<p>Plan: ${safePlan}${periodHtml}</p>
<p>We are not opening accounts yet. The request stays on the waitlist.</p>`,
    }
  }
  return {
    subject: 'AURE talebin waitlist’te',
    text: `Merhaba ${oneLine(input.name)},\n\nOnay kodun doğrulandı. Talebin bekleme listesine yazıldı.\n\nPaket: ${plan}\n${periodText}\nŞimdilik hesap açmıyoruz. Talebin bekleme listesinde duruyor.`,
    html: `<p>${hello}</p>
<p>Onay kodun doğrulandı. Talebin bekleme listesine yazıldı.</p>
<p>Paket: ${safePlan}${periodHtml}</p>
<p>Şimdilik hesap açmıyoruz. Talebin bekleme listesinde duruyor.</p>`,
  }
}

export function confirmMailCopy(
  locale: ApiLocale,
  code: string,
  link: string,
  purpose: 'waitlist' | 'support' = 'waitlist',
) {
  const safeCode = escapeHtml(code)
  const safeLink = escapeHtml(link)
  const support = purpose === 'support'
  if (locale === 'en') {
    return {
      subject: support ? 'Confirm your AURE support message' : 'Confirm your AURE request',
      text: `Your confirmation code: ${code}\n\nOpen the confirmation page and enter this code:\n${link}\n\nThe code is valid for 30 minutes.`,
      html: `<p>Use this code to confirm your AURE ${support ? 'support message' : 'waitlist request'}:</p>
<p style="font-size:28px;letter-spacing:0.12em;font-weight:700">${safeCode}</p>
<p><a href="${safeLink}">Open the confirmation page</a> and enter the code. It is valid for 30 minutes.</p>`,
    }
  }
  return {
    subject: support ? 'AURE destek talebin' : 'AURE talep onayın',
    text: `${support ? 'Destek talebini' : 'Talebini'} onaylamak için kod: ${code}\n\nOnay sayfasını açıp bu kodu yaz:\n${link}\n\nKod 30 dakika geçerli.`,
    html: `<p>AURE ${support ? 'destek talebini' : 'waitlist talebini'} onaylamak için kodun:</p>
<p style="font-size:28px;letter-spacing:0.12em;font-weight:700">${safeCode}</p>
<p><a href="${safeLink}">Onay sayfasını aç</a> ve kodu yaz. Kod 30 dakika geçerli.</p>`,
  }
}
