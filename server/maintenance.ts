export function maintenanceEnabled(value = process.env.MAINTENANCE) {
  const flag = (value || '').trim().toLowerCase()
  return flag === '1' || flag === 'true' || flag === 'on'
}

export function isMaintenancePath(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === '/maintenance' || path === '/maintenance.html'
}

export function maintenanceAction(pathname: string, enabled: boolean): '/' | '/maintenance' | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (enabled) {
    if (path === '/maintenance') return null
    return '/maintenance'
  }
  if (isMaintenancePath(path)) return '/'
  return null
}
