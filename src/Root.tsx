import { useEffect, useState } from 'react'
import App from './App.tsx'
import CampaignsPage from './CampaignsPage.tsx'
import ComparePage from './ComparePage.tsx'
import ConfirmPage from './ConfirmPage.tsx'
import WaitlistPage from './WaitlistPage.tsx'
import { LocaleProvider } from './i18n/LocaleContext.tsx'
import { isCampaignsLocation, isCompareLocation, isConfirmLocation, isWaitlistLocation } from './base.ts'
import { recordVisit } from './visits.ts'

function pageFromLocation() {
  if (isWaitlistLocation()) return 'waitlist'
  if (isCompareLocation()) return 'compare'
  if (isCampaignsLocation()) return 'campaigns'
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

  const view =
    page === 'waitlist' ? (
      <WaitlistPage />
    ) : page === 'compare' ? (
      <ComparePage />
    ) : page === 'campaigns' ? (
      <CampaignsPage />
    ) : page === 'confirm' ? (
      <ConfirmPage />
    ) : (
      <App />
    )

  return <LocaleProvider>{view}</LocaleProvider>
}
