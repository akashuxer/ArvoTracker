import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/**
 * What happened while you were looking somewhere else.
 *
 * The rule for what earns a notification: it finished on its own, after you
 * stopped watching. A run you started ten minutes ago failing is worth a mark
 * on the bell; a tag you just deleted is not -- you were there, you saw the
 * toast, and repeating it in a list is noise. Toasts are for "your action
 * worked", notifications are for "something changed without you".
 *
 * So these come from polling, not from view callbacks. The watcher lives in
 * the shell rather than in Run Manager or Pipelines, because the whole point
 * is to catch the transition on whichever screen you happen to be on.
 */

const STORE_KEY = 'o9pu.notifications.v1'
const MAX_KEPT = 50
const POLL_MS = 15_000

/* Terminal states, and how each should read. These are interface feedback, so
   the Arvo SEMANTIC palette -- not ArvoVisualPalette, which is for data. */
const OUTCOMES = {
  completed: { tone: 'positive', verb: 'finished cleanly' },
  failed: { tone: 'negative', verb: 'failed' },
  aborted: { tone: 'warning', verb: 'was aborted' },
  COMPLETED: { tone: 'positive', verb: 'finished cleanly' },
  FAILED: { tone: 'negative', verb: 'failed' },
  ABORTED: { tone: 'warning', verb: 'was aborted' },
  COMPLETED_WITH_ERRORS: { tone: 'warning', verb: 'finished with errors' },
}

const IN_FLIGHT = new Set(['running', 'queued', 'RUNNING', 'QUEUED', 'PENDING'])

const NotificationsContext = createContext(null)

/* localStorage is per-viewer and can throw (private window, blocked site
   data), so every touch is guarded and the app renders fine without it. */
function read() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(items) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0, MAX_KEPT)))
  } catch {
    /* Nothing to do -- the list still works for this session. */
  }
}

export function NotificationsProvider({
  /* What to watch, supplied by the host. The shell must not know which
     backend a tool talks to -- that is the whole reason it can frame a tool
     in another repository on another stack.

     Each source is an async function returning that tool's runs. Passing
     none leaves the bell quiet rather than erroring, which is the right
     behaviour for a host that has nothing to watch yet. */
  sources = [],
  children,
}) {
  const [items, setItems] = useState(read)
  /* What each watched run looked like last time we asked. A notification is a
     TRANSITION, so the first sighting of a run never raises one -- otherwise
     opening the app would announce every historical failure at once. */
  const seen = useRef(null)

  const add = useCallback((entries) => {
    if (!entries.length) return
    setItems((current) => {
      const known = new Set(current.map((n) => n.id))
      const fresh = entries.filter((e) => !known.has(e.id))
      if (!fresh.length) return current
      const next = [...fresh, ...current].slice(0, MAX_KEPT)
      write(next)
      return next
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function poll() {
      /* Each source fails independently: one tool's backend being down
         must not silence the notifications of another. */
      const [jobs, pipelines] = await Promise.all(
        [sources[0], sources[1]].map((load) => (load ? load().catch(() => null) : null))
      )
      if (cancelled) return

      const current = new Map()
      const raised = []

      const consider = (key, status, entry) => {
        current.set(key, status)
        const previous = seen.current?.get(key)
        /* Only a move FROM in-flight TO terminal counts. */
        if (!previous || !IN_FLIGHT.has(previous) || IN_FLIGHT.has(status)) return
        const outcome = OUTCOMES[status]
        if (outcome) raised.push({ ...entry, tone: outcome.tone, verb: outcome.verb })
      }

      ;(jobs?.runs ?? []).forEach((r) =>
        consider(`job:${r.run_id}`, r.status, {
          id: `job:${r.run_id}:${r.status}`,
          title: r.directory_name || `Run #${r.run_id}`,
          detail: r.status_reason || r.script_name || '',
          view: 'runs',
          at: Date.now(),
        })
      )

      ;(pipelines?.runs ?? []).forEach((r) =>
        consider(`pipeline:${r.run_id}`, r.status, {
          id: `pipeline:${r.run_id}:${r.status}`,
          title: r.pipeline_name || r.run_id,
          detail: r.error_message || r.current_step_name || '',
          view: 'pipelines',
          at: Date.now(),
        })
      )

      /* First pass only records the baseline. */
      if (seen.current) add(raised)
      seen.current = current
    }

    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [add])

  const value = useMemo(
    () => ({
      items,
      unreadCount: items.filter((n) => !n.isRead).length,
      markAllRead: () =>
        setItems((current) => {
          const next = current.map((n) => ({ ...n, isRead: true }))
          write(next)
          return next
        }),
      markRead: (id) =>
        setItems((current) => {
          const next = current.map((n) => (n.id === id ? { ...n, isRead: true } : n))
          write(next)
          return next
        }),
      clear: () => {
        write([])
        setItems([])
      },
    }),
    [items]
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}

/** "just now", "12m ago", "3h ago", "2d ago" -- relative, because what matters
 *  about a finished run is how stale the news is. */
export function timeAgo(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
