export function withBase(path = '') {
  const base = import.meta.env.BASE_URL
  const clean = path.replace(/^\//, '')
  if (!clean) return base
  return `${base}${clean}`
}

function hashValue(hash = window.location.hash) {
  return hash.replace(/^#/, '')
}

function pathPage(pathname = window.location.pathname) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  let rest = pathname.replace(/\/+$/, '') || '/'
  if (base && rest.startsWith(base)) rest = rest.slice(base.length) || '/'
  return rest.replace(/^\//, '')
}

export function isWaitlistHash(hash = window.location.hash) {
  const value = hashValue(hash)
  return value === '/waitlist' || value === 'waitlist'
}

export function isCompareHash(hash = window.location.hash) {
  const value = hashValue(hash)
  return value === '/compare' || value === 'compare'
}

export function isCampaignsHash(hash = window.location.hash) {
  const value = hashValue(hash)
  return value === '/campaigns' || value === 'campaigns' || value === '/kampanyalar' || value === 'kampanyalar'
}

export function isWaitlistLocation() {
  return pathPage() === 'waitlist' || isWaitlistHash()
}

export function isCompareLocation() {
  return pathPage() === 'compare' || isCompareHash()
}

export function isCampaignsLocation() {
  const page = pathPage()
  return page === 'campaigns' || page === 'kampanyalar' || isCampaignsHash()
}

export function isConfirmHash(hash = window.location.hash) {
  const value = hashValue(hash).split('?')[0]
  return value === '/confirm' || value === 'confirm'
}

export function isConfirmLocation() {
  return pathPage() === 'confirm' || isConfirmHash()
}
