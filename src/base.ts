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

export function isCalcHash(hash = window.location.hash) {
  const value = hashValue(hash)
  return value === '/hesaplama' || value === 'hesaplama' || value === '/calculate' || value === 'calculate'
}

export function isCompareHash(hash = window.location.hash) {
  const value = hashValue(hash)
  return value === '/compare' || value === 'compare' || value === '/karsilastir' || value === 'karsilastir'
}

export function isSupportHash(hash = window.location.hash) {
  const value = hashValue(hash)
  return value === '/support' || value === 'support' || value === '/destek' || value === 'destek'
}

export function isCampaignsHash(hash = window.location.hash) {
  const value = hashValue(hash)
  return value === '/campaigns' || value === 'campaigns' || value === '/kampanyalar' || value === 'kampanyalar'
}

export function isBlogHash(hash = window.location.hash) {
  const value = hashValue(hash)
  return value === '/blog' || value === 'blog'
}

export function isPartnersHash(hash = window.location.hash) {
  const value = hashValue(hash)
  return (
    value === '/isbirlikleri' ||
    value === 'isbirlikleri' ||
    value === '/partners' ||
    value === 'partners'
  )
}

export function isWaitlistLocation() {
  return pathPage() === 'waitlist' || isWaitlistHash()
}

export function isCalcLocation() {
  const page = pathPage()
  return page === 'hesaplama' || page === 'calculate' || isCalcHash()
}

export function isCompareLocation() {
  const page = pathPage()
  return page === 'compare' || page === 'karsilastir' || isCompareHash()
}

export function isSupportLocation() {
  const page = pathPage()
  return page === 'support' || page === 'destek' || isSupportHash()
}

export function isCampaignsLocation() {
  const page = pathPage()
  return page === 'campaigns' || page === 'kampanyalar' || isCampaignsHash()
}

export function isBlogLocation() {
  return pathPage() === 'blog' || isBlogHash()
}

export function isPartnersLocation() {
  const page = pathPage()
  return page === 'isbirlikleri' || page === 'partners' || isPartnersHash()
}

export function isConfirmHash(hash = window.location.hash) {
  const value = hashValue(hash).split('?')[0]
  return value === '/confirm' || value === 'confirm'
}

export function isConfirmLocation() {
  return pathPage() === 'confirm' || isConfirmHash()
}

export function confirmTokenFromLocation(loc: { search: string; hash: string } = window.location) {
  const fromSearch = new URLSearchParams(loc.search).get('token')?.trim() || ''
  if (fromSearch) return fromSearch
  const hash = loc.hash.replace(/^#/, '')
  const query = hash.indexOf('?')
  if (query === -1) return ''
  return new URLSearchParams(hash.slice(query + 1)).get('token')?.trim() || ''
}
