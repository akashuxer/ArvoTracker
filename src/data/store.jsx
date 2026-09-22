import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AREAS, PUSHES, TEAM, VIOLATIONS, WORK_ITEMS } from './mock'
import { RULE } from './rules'
import { CLOSED_STATUSES, SETTLED_VIOLATION_STATUSES } from './enums'

/**
 * The tracker's whole data layer, behind one provider.
 *
 * Everything is in memory. The point of keeping it behind a provider rather than
 * importing the fixtures straight into each view is that `load` is the only
 * thing that changes when the real sources arrive -- the views already treat the
 * data as something that can be absent, slow or wrong.
 *
 *   workItems   -> design-system backlog API
 *   areas       -> component-import analysis
 *   pushes      -> git push / PR webhook
 *   violations  -> Arvo lint + axe + token validation, per push
 */
const TrackerContext = createContext(null)

/* Long enough that the loading state is a real state someone has to have
   designed, short enough not to be in the way. Every view renders ViewLoading
   through this, so a screen cannot be written that assumes data is already
   there -- which is the mistake that makes a real fetch fail on arrival. */
const LOAD_MS = 260

export function TrackerProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', error: null })
  const [workItems, setWorkItems] = useState([])
  const [areas, setAreas] = useState([])
  const [violations, setViolations] = useState([])
  const [pushes, setPushes] = useState([])

  const load = useCallback(() => {
    setState({ status: 'loading', error: null })
    const timer = setTimeout(() => {
      try {
        setWorkItems(WORK_ITEMS)
        setAreas(AREAS)
        setViolations(VIOLATIONS)
        setPushes(PUSHES)
        setState({ status: 'ready', error: null })
      } catch (e) {
        setState({ status: 'error', error: e.message })
      }
    }, LOAD_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(load, [load])

  /* ---- Roadmap ---------------------------------------------------------- */

  const saveWorkItem = useCallback((values) => {
    setWorkItems((current) => {
      const now = new Date().toISOString()
      const existing = current.find((w) => w.id === values.id)
      if (existing) {
        /* A status change is decision history, so it is appended rather than
           overwritten: "why is this Blocked" is the question this section
           exists to answer, and an audit trail is the only thing that can. */
        const notes =
          existing.status !== values.status
            ? [
                ...(values.notes ?? existing.notes ?? []),
                {
                  at: now,
                  by: values.owner || 'Unassigned',
                  text: `Status moved from ${existing.status} to ${values.status}.`,
                },
              ]
            : (values.notes ?? existing.notes ?? [])
        return current.map((w) => (w.id === values.id ? { ...w, ...values, notes, updated: now } : w))
      }
      return [{ ...values, created: now, updated: now, notes: values.notes ?? [] }, ...current]
    })
  }, [])

  const deleteWorkItem = useCallback((id) => {
    setWorkItems((current) => current.filter((w) => w.id !== id))
  }, [])

  /** The next free id, so a created item looks like the ones around it. */
  const nextWorkItemId = useCallback(() => {
    const highest = workItems.reduce((max, w) => {
      const n = Number(String(w.id).replace(/\D/g, ''))
      return Number.isFinite(n) && n > max ? n : max
    }, 0)
    return `ARV-${highest + 1}`
  }, [workItems])

  /* ---- Violations ------------------------------------------------------- */

  const setViolationStatus = useCallback((id, status) => {
    setViolations((current) =>
      current.map((v) => {
        if (v.id !== id) return v
        /* Settling stamps the date; reopening clears it. Without both halves the
           average-time-to-resolve figure would keep counting a finding that came
           back, which is the one case where the number matters most. */
        const isSettled = SETTLED_VIOLATION_STATUSES.has(status)
        return { ...v, status, resolvedAt: isSettled ? v.resolvedAt || new Date().toISOString() : '' }
      })
    )
  }, [])

  const assignViolation = useCallback((id, assignee) => {
    setViolations((current) => current.map((v) => (v.id === id ? { ...v, assignee } : v)))
  }, [])

  /**
   * Accept a scan result in the shape CI will post.
   *
   *   { repository, branch, commitId, commitMessage, author, team?, timestamp,
   *     violations: [ { ruleId, category?, severity?, file, line, message?,
   *                     recommendedFix?, occurrences? } ] }
   *
   * Returns `{ ok, added, pushId }` or `{ ok: false, error }`. It never throws:
   * an import is a thing a person does by hand from a file they may have edited,
   * so the failure has to arrive as a message on the form rather than as a blank
   * screen.
   *
   * Repeat detection happens here, against what is already stored, because the
   * scanner only sees one push -- it cannot know the finding is the fourth time.
   */
  const importScan = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return { ok: false, error: 'Expected a JSON object.' }
    const { repository, violations: incoming } = payload
    if (!repository) return { ok: false, error: 'Missing "repository".' }
    if (!Array.isArray(incoming)) return { ok: false, error: 'Missing "violations" array.' }

    const unknown = incoming.map((v) => v.ruleId).filter((id) => id && !RULE[id])
    if (unknown.length) {
      return {
        ok: false,
        error: `Unknown rule ${[...new Set(unknown)].join(', ')}. Add it to the rule registry first — a violation with no rule behind it cannot tell a team what to do.`,
      }
    }

    const at = payload.timestamp ?? new Date().toISOString()
    const team = payload.team ?? TEAM[payload.teamId]?.id ?? ''
    const pushId = `import-${Date.now()}`
    const push = {
      id: pushId,
      repository,
      team,
      branch: payload.branch ?? '',
      commitId: payload.commitId ?? '',
      commitMessage: payload.commitMessage ?? '',
      author: payload.author ?? '',
      timestamp: at,
    }

    let added = 0
    setViolations((current) => {
      /* Ids continue the existing sequence rather than embedding a timestamp.
         "V-1189" sits in a column of "V-1188"s; "V-i1758059453844-0" does not,
         and an id is something people read out to each other. */
      const highest = current.reduce((max, v) => {
        const n = Number(String(v.id).replace(/\D/g, ''))
        return Number.isFinite(n) && n > max ? n : max
      }, 0)
      const rows = incoming.map((v, i) => {
        const rule = RULE[v.ruleId]
        /* Same definition the fixtures use: RECURRING within three weeks, not
           "seen at any point". A flag that is almost always on is not a signal,
           and an import must not label findings differently from the rest. */
        const earlier = current
          .filter((e) => e.repository === repository && e.file === v.file && e.ruleId === v.ruleId)
          .sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt))
        const previous = earlier[0]
        const oldest = earlier[earlier.length - 1]
        const isRecurring =
          !!previous && new Date(at) - new Date(previous.detectedAt) <= 21 * 86_400_000
        return {
          id: `V-${highest + i + 1}`,
          ruleId: v.ruleId,
          /* The rule is authoritative for category and severity. A scanner that
             disagrees is out of date, and taking its word would let two rows of
             the same rule report different severities. */
          category: rule?.category ?? v.category ?? 'Unapproved pattern',
          severity: rule?.severity ?? v.severity ?? 'low',
          repository,
          productArea: v.productArea ?? '',
          branch: push.branch,
          pushId,
          commitId: push.commitId,
          commitMessage: push.commitMessage,
          author: push.author,
          team,
          detectedAt: at,
          file: v.file ?? '',
          line: v.line ?? 0,
          occurrences: v.occurrences ?? 1,
          firstDetected: oldest?.firstDetected ?? at,
          isRepeated: isRecurring,
          status: 'new',
          resolvedAt: '',
          assignee: '',
          message: v.message ?? '',
        }
      })
      added = rows.length
      return [...rows, ...current]
    })
    setPushes((current) => [...current, push])
    return { ok: true, added: incoming.length, pushId }
  }, [])

  /* ---- Derived ---------------------------------------------------------- */

  /* Derived once here rather than in each view, so the summary cards, the table
     and the charts cannot disagree about what "open" means. */
  const derived = useMemo(() => {
    const openItems = workItems.filter((w) => !CLOSED_STATUSES.has(w.status))
    const activeViolations = violations.filter((v) => !SETTLED_VIOLATION_STATUSES.has(v.status))
    const latestPush = pushes[pushes.length - 1] ?? null
    return {
      openItems,
      activeViolations,
      latestPush,
      latestPushViolations: latestPush ? violations.filter((v) => v.pushId === latestPush.id) : [],
    }
  }, [workItems, violations, pushes])

  const value = useMemo(
    () => ({
      ...state,
      workItems,
      areas,
      violations,
      pushes,
      ...derived,
      reload: load,
      saveWorkItem,
      deleteWorkItem,
      nextWorkItemId,
      setViolationStatus,
      assignViolation,
      importScan,
    }),
    [state, workItems, areas, violations, pushes, derived, load, saveWorkItem, deleteWorkItem, nextWorkItemId, setViolationStatus, assignViolation, importScan]
  )

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>
}

export function useTracker() {
  const ctx = useContext(TrackerContext)
  if (!ctx) throw new Error('useTracker must be used inside TrackerProvider')
  return ctx
}
