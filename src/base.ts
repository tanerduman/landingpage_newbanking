export function withBase(path = '') {
  const base = import.meta.env.BASE_URL
  const clean = path.replace(/^\//, '')
  if (!clean) return base
  return `${base}${clean}`
}

export function isWaitlistHash(hash = window.location.hash) {
  const value = hash.replace(/^#/, '')
  return value === '/waitlist' || value === 'waitlist'
}
