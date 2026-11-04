import { useEffect, useState } from 'react'
import App from './App.tsx'
import WaitlistPage from './WaitlistPage.tsx'
import { isWaitlistHash } from './base.ts'

export default function Root() {
  const [waitlist, setWaitlist] = useState(() => isWaitlistHash())

  useEffect(() => {
    function sync() {
      setWaitlist(isWaitlistHash())
    }
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  if (waitlist) {
    return <WaitlistPage />
  }
  return <App />
}
