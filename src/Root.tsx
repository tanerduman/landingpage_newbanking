import { useEffect, useState } from 'react'
import App from './App.tsx'
import WaitlistPage from './WaitlistPage.tsx'
import { isWaitlistPath } from './base.ts'

export default function Root() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    function onPop() {
      setPath(window.location.pathname)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (isWaitlistPath(path)) {
    return <WaitlistPage />
  }
  return <App />
}
