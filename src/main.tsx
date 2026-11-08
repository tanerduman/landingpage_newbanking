import { Analytics } from '@vercel/analytics/react'
import { initBotId } from 'botid/client/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { botProtectedRoutes } from './botProtection.ts'
import './index.css'
import Root from './Root.tsx'

initBotId({ protect: botProtectedRoutes })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
    <Analytics />
  </StrictMode>,
)
