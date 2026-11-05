import { useEffect, useState } from 'react'
import App from './App.tsx'
import CampaignsPage from './CampaignsPage.tsx'
import ComparePage from './ComparePage.tsx'
import WaitlistPage from './WaitlistPage.tsx'
import { isCampaignsLocation, isCompareLocation, isWaitlistLocation } from './base.ts'
import { recordVisit } from './visits.ts'

function pageFromLocation() {
  if (isWaitlistLocation()) return 'waitlist'
  if (isCompareLocation()) return 'compare'
  if (isCampaignsLocation()) return 'campaigns'
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

  if (page === 'waitlist') return <WaitlistPage />
  if (page === 'compare') return <ComparePage />
  if (page === 'campaigns') return <CampaignsPage />
  return <App />
}
