import { useEffect, useState } from 'react'
import { ArvoLoader } from '@arvo/react'

/**
 * The loading state for a whole screen -- which mostly means showing nothing.
 *
 * Every view discards its data on mount and refetches, and every one of those
 * fetches lands in well under a second: measured in this app, 22ms (Reports),
 * 45ms (History), 65ms (Tags), 104ms (Pipelines), 140ms (Log Analyzer). A
 * "Loading…" that appears and vanishes inside 45ms is not information, it is a
 * flicker, and it made in-app navigation feel like a page reload.
 *
 * So nothing renders for the first `delay` ms. Below that the swap simply
 * looks instant. Past it -- a cold Kubernetes call, a slow query -- the loader
 * appears and is genuinely worth showing.
 */
export default function ViewLoading({ message = 'Loading…', delay = 250 }) {
  const [isVisible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!isVisible) return null

  return (
    <div className="view-loading">
      <ArvoLoader variant="dot" size="md" tone="theme" message={message} />
    </div>
  )
}
