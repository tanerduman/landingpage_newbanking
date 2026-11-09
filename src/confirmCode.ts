export const CONFIRM_CODE_DIGITS = 8
export const CONFIRM_CODE_RE = new RegExp(`^\\d{${CONFIRM_CODE_DIGITS}}$`)
export const CONFIRM_TTL_MS = 30 * 60_000
export const CONFIRM_EMAIL_ATTEMPTS = 8
