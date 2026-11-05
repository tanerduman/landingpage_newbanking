import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type PreviewServer, type ViteDevServer } from 'vite'
import { handleApiRequest, nodeToWebRequest, writeNodeResponse } from './server/http.ts'

function apiPlugin(env: Record<string, string>) {
  if (env.FREECURRENCYAPI_KEY) process.env.FREECURRENCYAPI_KEY = env.FREECURRENCYAPI_KEY
  if (env.RESEND_API_KEY) process.env.RESEND_API_KEY = env.RESEND_API_KEY
  if (env.MAIL_FROM) process.env.MAIL_FROM = env.MAIL_FROM
  if (env.APP_URL) process.env.APP_URL = env.APP_URL
  if (env.CAPTCHA_SECRET) process.env.CAPTCHA_SECRET = env.CAPTCHA_SECRET
  async function attach(server: ViteDevServer | PreviewServer) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api')) {
        next()
        return
      }
      try {
        const request = await nodeToWebRequest(req)
        const response = await handleApiRequest(request)
        if (!response) {
          next()
          return
        }
        await writeNodeResponse(response, res)
      } catch {
        res.statusCode = 500
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: 'Sunucu hatası.' }))
      }
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
  },
  preview: {
    host: true,
    port: 4173,
  },
}
})
