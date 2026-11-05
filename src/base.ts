export function withBase(path = '') {
  const base = import.meta.env.BASE_URL
  const clean = path.replace(/^\//, '')
  if (!clean) return base
  return `${base}${clean}`
}

function hashValue(hash = window.location.hash) {
  return hash.replace(/^#/, '')
}

export function isWaitlistHash(hash = window.location.hash) {
  const value = hashValue(hash)
  return value === '/waitlist' || value === 'waitlist'
}

export function isCompareHash(hash = window.location.hash) {
  const value = hashValue(hash)
  return value === '/compare' || value === 'compare'
}
