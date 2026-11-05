import react from '@vitejs/plugin-react'
import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite'
import { handleApiRequest, nodeToWebRequest, writeNodeResponse } from './server/http.ts'

function apiPlugin() {
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

export default defineConfig({
  plugins: [react(), apiPlugin()],
  base: process.env.GITHUB_PAGES === '1' ? '/landingpage_newbanking/' : '/',
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
