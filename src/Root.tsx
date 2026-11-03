import { useEffect, useState } from 'react'
import App from './App.tsx'
import WaitlistPage from './WaitlistPage.tsx'

export default function Root() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    function onPop() {
      setPath(window.location.pathname)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (path === '/waitlist' || path === '/waitlist/') {
    return <WaitlistPage />
  }
  return <App />
}
