import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const repoBase = '/landingpage_newbanking/'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? repoBase : '/',
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
