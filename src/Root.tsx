import { useEffect, useState } from 'react'
import App from './App.tsx'
import CalculatorPage from './CalculatorPage.tsx'
import CampaignsPage from './CampaignsPage.tsx'
import PartnersPage from './PartnersPage.tsx'
import ComparePage from './ComparePage.tsx'
import ConfirmPage from './ConfirmPage.tsx'
import SupportPage from './SupportPage.tsx'
import WaitlistPage from './WaitlistPage.tsx'
import { LocaleProvider } from './i18n/LocaleContext.tsx'
import {
  isCalculatorLocation,
  isCampaignsLocation,
  isPartnersLocation,
  isCompareLocation,
  isConfirmLocation,
  isSupportLocation,
  isWaitlistLocation,
} from './base.ts'
import { recordVisit } from './visits.ts'

function pageFromLocation() {
  if (isWaitlistLocation()) return 'waitlist'
  if (isSupportLocation()) return 'support'
  if (isCompareLocation()) return 'compare'
  if (isCampaignsLocation()) return 'campaigns'
  if (isCalculatorLocation()) return 'calculator'
  if (isPartnersLocation()) return 'partners'
  if (isConfirmLocation()) return 'confirm'
  return 'home'
}

export default function Root() {
  const [page, setPage] = useState(pageFromLocation)

  useEffect(() => {
    void recordVisit()
    function sync() {
      setPage(pageFromLocation())
    }
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]')
    if (page !== 'waitlist') {
      existing?.remove()
      return
    }
    let meta = existing
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex, nofollow')
  }, [page])

  const view =
    page === 'waitlist' ? (
      <WaitlistPage />
    ) : page === 'compare' ? (
      <ComparePage />
    ) : page === 'campaigns' ? (
      <CampaignsPage />
    ) : page === 'calculator' ? (
      <CalculatorPage />
    ) : page === 'partners' ? (
      <PartnersPage />
    ) : page === 'confirm' ? (
      <ConfirmPage />
    ) : page === 'support' ? (
      <SupportPage />
    ) : (
      <App />
    )

  return <LocaleProvider>{view}</LocaleProvider>
}
