export function maintenanceEnabled(value = process.env.MAINTENANCE) {
  const flag = (value || '').trim().toLowerCase()
  return flag === '1' || flag === 'true' || flag === 'on'
}

export function isMaintenancePath(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === '/maintenance' || path === '/maintenance.html'
}

function isRegionPath(pathname: string) {
  return pathname === '/region' || pathname === '/region.html'
}

export function maintenanceAction(pathname: string, enabled: boolean): '/' | '/maintenance' | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  // The country firewall sends visitors outside Turkey to /region.
  // Leave that page alone so the two redirects cannot chase each other.
  if (isRegionPath(path)) return null
  if (enabled) {
    if (path === '/maintenance') return null
    return '/maintenance'
  }
  if (isMaintenancePath(path)) return '/'
  return null
}
