export function withBase(path = '') {
  const base = import.meta.env.BASE_URL
  const clean = path.replace(/^\//, '')
  if (!clean) return base
  return `${base}${clean}`
}

export function isWaitlistPath(pathname: string) {
  const waitlist = withBase('waitlist').replace(/\/$/, '')
  const current = pathname.replace(/\/$/, '') || '/'
  return current === waitlist
}
