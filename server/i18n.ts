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

const RECEIPT_HOME = 'https://www.getaure.org'
const PLAIN_SIGN = 'AURE · getaure.org'

function receiptRows(rows: { label: string; value: string; message?: boolean }[]) {
  return rows
    .map((row, index) => {
      const border = index === rows.length - 1 ? '' : 'border-bottom:1px solid rgba(244,241,234,0.08);'
      const valueStyle = row.message
        ? 'margin-top:8px;font-size:15px;line-height:1.6;font-weight:400;color:#f4f1ea;white-space:pre-wrap;'
        : 'margin-top:6px;font-size:20px;line-height:1.2;font-weight:700;color:#f4f1ea;'
      return `<tr>
<td style="padding:18px 20px;${border}font-family:Segoe UI,Helvetica,Arial,sans-serif;">
<div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9a9589;">${row.label}</div>
<div style="${valueStyle}">${row.value}</div>
</td>
</tr>`
    })
    .join('')
}

function mailOrigin(link: string) {
  try {
    const url = new URL(link)
    return `${url.protocol}//${url.host}`
  } catch {
    return RECEIPT_HOME
  }
}

/** Dark card shared by the OTP mail and the note that follows it. The logo sits in the footer. */
function receiptCard(
  locale: ApiLocale,
  home: string,
  logo: string,
  parts: {
    eyebrow: string
    hello: string
    helloStyle?: string
    lead: string
    rows: { label: string; value: string; message?: boolean }[]
    action?: { href: string; label: string }
    closing?: string
  },
) {
  const legal =
    locale === 'en'
      ? 'A fictional product — it does not provide real banking services.'
      : 'Kurgusal ürün — gerçek bankacılık hizmeti sunmaz.'
  const titleStyle =
    parts.helloStyle ||
    'font-size:30px;line-height:1.15;letter-spacing:-0.03em;font-weight:700;color:#f4f1ea;'
  const panel = parts.rows.length
    ? `<tr>
<td style="padding:22px 40px 0;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#18181c" style="background:#18181c;border-radius:16px;">
${receiptRows(parts.rows)}
</table>
</td>
</tr>`
    : ''
  const action = parts.action
    ? `<tr>
<td align="center" style="padding:22px 40px 0;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
<a href="${escapeHtml(parts.action.href)}" style="text-decoration:none;"><table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
<td bgcolor="#d8ff4a" style="background:#d8ff4a;border-radius:999px;padding:12px 22px;font-size:15px;line-height:1;font-weight:700;color:#0b0b0c;">${parts.action.label}</td>
</tr></table></a>
</td>
</tr>`
    : ''
  const below = parts.closing
    ? `<tr><td style="padding:18px 40px 28px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#9a9589;">${parts.closing}</td></tr>`
    : `<tr><td style="height:28px;font-size:0;line-height:0;">&nbsp;</td></tr>`
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>AURE</title>
</head>
<body style="margin:0;padding:0;background:#070708;" bgcolor="#070708">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#070708" style="background:#070708;">
<tr>
<td align="center" style="padding:28px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="#111114" style="width:100%;max-width:560px;background:#111114;border:1px solid rgba(244,241,234,0.12);border-radius:22px;overflow:hidden;">
<tr><td bgcolor="#d8ff4a" style="height:4px;background:#d8ff4a;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr>
<td style="padding:34px 40px 0;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="border:1px solid rgba(244,241,234,0.14);border-radius:999px;padding:6px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td bgcolor="#d8ff4a" style="width:7px;height:7px;background:#d8ff4a;border-radius:50%;font-size:0;line-height:0;">&nbsp;</td>
<td style="padding-left:8px;font-size:13px;letter-spacing:0.02em;color:#9a9589;">${parts.eyebrow}</td>
</tr></table>
</td>
</tr></table>
<p style="margin:20px 0 10px;${titleStyle}">${parts.hello}</p>
<p style="margin:0;font-size:16px;line-height:1.6;color:#9a9589;">${parts.lead}</p>
</td>
</tr>
${panel}
${action}
${below}
<tr><td style="padding:0 40px;"><div style="height:1px;background:rgba(244,241,234,0.1);font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr>
<td align="center" style="padding:22px 40px 28px;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
<a href="${escapeHtml(home)}" style="text-decoration:none;">
<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
<td style="vertical-align:middle;"><img src="${escapeHtml(logo)}" width="32" height="32" alt="" style="display:block;border:0;width:32px;height:32px;"></td>
<td style="padding-left:10px;vertical-align:middle;font-size:14px;font-weight:800;letter-spacing:0.16em;color:#f4f1ea;">AURE</td>
</tr></table>
</a>
<p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#9a9589;">${legal}</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`
}

/** Team copy of a support note. It goes out before the visitor enters the code. */
export function supportInboxCopy(input: { name: string; email: string; kind: string; message: string }) {
  const kind = labeled(KIND_LABEL.tr, input.kind)
  const name = oneLine(input.name)
  const email = oneLine(input.email)
  const message = input.message.trim()
  return {
    subject: `AURE destek: ${kind} — ${name}`,
    text: `Onay kodu girilmeden iletildi.\n\nAd soyad: ${name}\nE-posta: ${email}\nTür: ${kind}\nAçıklama:\n${message}\n\n${PLAIN_SIGN}`,
    html: receiptCard('tr', RECEIPT_HOME, `${RECEIPT_HOME}/email-logo.png`, {
      eyebrow: 'Destek kutusu',
      hello: escapeHtml(name),
      lead: 'Onay kodu girilmeden iletildi.',
      rows: [
        { label: 'Ad soyad', value: escapeHtml(name) },
        { label: 'E-posta', value: escapeHtml(email) },
        { label: 'Tür', value: escapeHtml(kind) },
        { label: 'Açıklama', value: escapeHtml(message), message: true },
      ],
    }),
  }
}

/** Sent after the OTP checks out. It describes the request and carries no code. */
export function receiptMailCopy(locale: ApiLocale, input: ReceiptInput, home = RECEIPT_HOME) {
  const origin = home.replace(/\/+$/, '') || RECEIPT_HOME
  const logo = `${origin}/email-logo.png`
  const displayName = oneLine(input.name)
  const hello = locale === 'en' ? `Hello ${escapeHtml(displayName)},` : `Merhaba ${escapeHtml(displayName)},`
  if (input.purpose === 'support') {
    const kind = labeled(KIND_LABEL[locale], input.kind)
    const message = input.message.trim()
    if (locale === 'en') {
      return {
        subject: 'Your AURE support note is on the list',
        text: `Hello ${displayName},\n\nYour code checked out. The support note is on the list.\n\nType: ${kind}\nMessage:\n${message}\n\n${PLAIN_SIGN}`,
        html: receiptCard(locale, origin, logo, {
          eyebrow: 'Support note',
          hello,
          lead: 'Your code checked out. The support note is on the list.',
          rows: [
            { label: 'Type', value: escapeHtml(kind) },
            { label: 'Message', value: escapeHtml(message), message: true },
          ],
        }),
      }
    }
    return {
      subject: 'AURE destek kaydın listede',
      text: `Merhaba ${displayName},\n\nOnay kodun doğrulandı. Destek kaydın listeye eklendi.\n\nTür: ${kind}\nAçıklama:\n${message}\n\n${PLAIN_SIGN}`,
      html: receiptCard(locale, origin, logo, {
        eyebrow: 'Destek kaydı',
        hello,
        lead: 'Onay kodun doğrulandı. Destek kaydın listeye eklendi.',
        rows: [
          { label: 'Tür', value: escapeHtml(kind) },
          { label: 'Açıklama', value: escapeHtml(message), message: true },
        ],
      }),
    }
  }
  const plan = labeled(PLAN_LABEL[locale], input.intent)
  const cycle = CYCLE_LABEL[locale][input.cycle] || ''
  const periodText = cycle ? (locale === 'en' ? `Period: ${cycle}\n` : `Dönem: ${cycle}\n`) : ''
  const rows = [{ label: locale === 'en' ? 'Plan' : 'Paket', value: escapeHtml(plan) }]
  if (cycle) rows.push({ label: locale === 'en' ? 'Period' : 'Dönem', value: escapeHtml(cycle) })
  if (locale === 'en') {
    return {
      subject: 'Your AURE request is on the waitlist',
      text: `Hello ${displayName},\n\nYour code checked out. The request is on the waitlist.\n\nPlan: ${plan}\n${periodText}\nWe are not opening accounts yet. The request stays on the waitlist.\n\n${PLAIN_SIGN}`,
      html: receiptCard(locale, origin, logo, {
        eyebrow: 'Request confirmed',
        hello,
        lead: 'Your code checked out. The request is on the waitlist.',
        rows,
        closing: 'We are not opening accounts yet. The request stays on the waitlist.',
      }),
    }
  }
  return {
    subject: 'AURE talebin waitlist’te',
    text: `Merhaba ${displayName},\n\nOnay kodun doğrulandı. Talebin bekleme listesine yazıldı.\n\nPaket: ${plan}\n${periodText}\nŞimdilik hesap açmıyoruz. Talebin bekleme listesinde duruyor.\n\n${PLAIN_SIGN}`,
    html: receiptCard(locale, origin, logo, {
      eyebrow: 'Talep onaylandı',
      hello,
      lead: 'Onay kodun doğrulandı. Talebin bekleme listesine yazıldı.',
      rows,
      closing: 'Şimdilik hesap açmıyoruz. Talebin bekleme listesinde duruyor.',
    }),
  }
}

export function confirmMailCopy(
  locale: ApiLocale,
  code: string,
  link: string,
  purpose: 'waitlist' | 'support' = 'waitlist',
) {
  const safeCode = escapeHtml(code)
  const support = purpose === 'support'
  const origin = mailOrigin(link)
  const logo = `${origin}/email-logo.png`
  const codeStyle =
    'font-size:34px;line-height:1.2;letter-spacing:0.22em;font-weight:700;color:#f4f1ea;padding-left:0.22em;'
  if (locale === 'en') {
    const lead = support
      ? 'The link confirms the support message. You do not need to type the code again.'
      : 'The link confirms the request. You do not need to type the code again.'
    return {
      subject: support ? 'Confirm your AURE support message' : 'Confirm your AURE request',
      text: `Your confirmation code: ${code}\n\nConfirm with this link. You do not need to type the code again:\n${link}\n\nThe link is valid for 30 minutes.\n\n${PLAIN_SIGN}`,
      html: receiptCard(locale, origin, logo, {
        eyebrow: 'Email confirmation',
        hello: safeCode,
        helloStyle: codeStyle,
        lead,
        rows: [],
        action: { href: link, label: support ? 'Confirm the support message' : 'Confirm the request' },
        closing: 'The link is valid for 30 minutes.',
      }),
    }
  }
  return {
    subject: support ? 'AURE destek talebin' : 'AURE talep onayın',
    text: `${support ? 'Destek talebini' : 'Talebini'} onaylamak için kod: ${code}\n\nKodu yeniden yazmadan onaylamak için bağlantıya tıkla:\n${link}\n\nBağlantı 30 dakika geçerli.\n\n${PLAIN_SIGN}`,
    html: receiptCard(locale, origin, logo, {
      eyebrow: 'E-posta onayı',
      hello: safeCode,
      helloStyle: codeStyle,
      lead: support
        ? 'Bağlantı destek talebini onaylar. Kodu yeniden yazmana gerek yok.'
        : 'Bağlantı talebi onaylar. Kodu yeniden yazmana gerek yok.',
      rows: [],
      action: { href: link, label: support ? 'Destek talebini onayla' : 'Talebi onayla' },
      closing: 'Bağlantı 30 dakika geçerli.',
    }),
  }
}
