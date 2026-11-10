import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type PreviewServer, type ViteDevServer } from 'vite'
import { handleApiRequest, nodeToWebRequest, writeNodeResponse } from './server/http.ts'
import { maintenanceAction, maintenanceEnabled } from './server/maintenance.ts'

function apiPlugin(env: Record<string, string>) {
  const maintenance = maintenanceEnabled(process.env.MAINTENANCE || env.MAINTENANCE)
  if (env.FREECURRENCYAPI_KEY) process.env.FREECURRENCYAPI_KEY = env.FREECURRENCYAPI_KEY
  if (env.COLLECTAPI_KEY) process.env.COLLECTAPI_KEY = env.COLLECTAPI_KEY
  if (env.RESEND_API_KEY) process.env.RESEND_API_KEY = env.RESEND_API_KEY
  if (env.MAIL_FROM) process.env.MAIL_FROM = env.MAIL_FROM
  if (env.APP_URL) process.env.APP_URL = env.APP_URL
  if (env.WAITLIST_USER) process.env.WAITLIST_USER = env.WAITLIST_USER
  if (env.WAITLIST_PASSWORD) process.env.WAITLIST_PASSWORD = env.WAITLIST_PASSWORD
  if (env.WAITLIST_SESSION_SECRET) process.env.WAITLIST_SESSION_SECRET = env.WAITLIST_SESSION_SECRET
  function attach(server: ViteDevServer | PreviewServer) {
    server.middlewares.use((req, res, next) => {
      const pathname = new URL(req.url || '/', 'http://localhost').pathname
      const target = maintenanceAction(pathname, maintenance)
      if (target) {
        res.statusCode = 307
        res.setHeader('Location', target)
        res.end()
        return
      }
      if (pathname === '/maintenance') req.url = '/maintenance.html'
      if (pathname === '/region') req.url = '/region.html'
      if (!req.url?.startsWith('/api')) {
        next()
        return
      }
      void nodeToWebRequest(req)
        .then((request) => handleApiRequest(request))
        .then(async (response) => {
          if (!response) {
            next()
            return
          }
          if (res.headersSent) return
          await writeNodeResponse(response, res)
        })
        .catch(() => {
          if (res.headersSent) return
          res.statusCode = 500
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Sunucu hatası.' }))
        })
    })
  }

  return {
    name: 'aure-api',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [react(), apiPlugin(env)],
  base: process.env.GITHUB_PAGES === '1' ? '/landingpage_newbanking/' : '/',
  server: {
    host: true,
    port: 5173,
    cors: false,
  },
  preview: {
    host: true,
    port: 4173,
  },
}
})
