import { next } from '@vercel/functions'
import { maintenanceAction, maintenanceEnabled } from './server/maintenance.ts'

export const config = { runtime: 'nodejs' }

export default function proxy(request: Request) {
  const url = new URL(request.url)
  const target = maintenanceAction(url.pathname, maintenanceEnabled())
  if (!target) return next()
  return Response.redirect(new URL(target, url.origin), 307)
}
