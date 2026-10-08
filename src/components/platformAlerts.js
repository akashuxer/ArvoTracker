/**
 * The platform alerts, and the rules for how they stack.
 *
 * Kept apart from the component so the rules can be read, and tested, without a
 * DOM: given what has been dismissed and where the reader is, what is the stack?
 *
 * There is ONE sequence of alerts, ordered by severity and then within it, and
 * the reader moves through it with Previous and Next. The stack of banners is
 * just that sequence's severities, drawn so the one the reader is in is in
 * front.
 */

const text = (value) => ({ type: 'text', value })
const strong = (value) => ({ type: 'strong', children: value })

/* Priority order, highest first. `label` is the product's word; `type` is
   Arvo's -- Error is `negative`, Success is `positive` -- and that mapping is the
   only translation in this file. */
export const SEVERITIES = [
  { id: 'error', label: 'Error', type: 'negative' },
  { id: 'warning', label: 'Warning', type: 'warning' },
  { id: 'info', label: 'Info', type: 'info' },
  { id: 'success', label: 'Success', type: 'positive' },
]
export const SEVERITY = Object.fromEntries(SEVERITIES.map((s) => [s.id, s]))

/* The whole sequence, in the order Next walks it: every Error, then every
   Warning, and so on. Ten alerts, four of them errors. */
export const ALERTS = [
  {
    id: 'error-1',
    severity: 'error',
    message: [
      text('The o9 '),
      strong('favourite'),
      text(' service is not available at the moment and a few UI features are affected.'),
    ],
  },
  {
    id: 'error-2',
    severity: 'error',
    message: [
      strong('Forecast sync'),
      text(' failed for 3 plans. Changes made since 09:10 are not saved to the shared plan.'),
    ],
  },
  {
    id: 'error-3',
    severity: 'error',
    message: [
      text('The '),
      strong('Planner'),
      text(' workspace could not be reached. Retrying every 30 seconds.'),
    ],
  },
  {
    id: 'error-4',
    severity: 'error',
    message: [
      text('Your '),
      strong('data warehouse'),
      text(' sign-in has expired. Sign in again to refresh scenario data.'),
    ],
  },
  {
    id: 'warning-1',
    severity: 'warning',
    message: [
      text('Scheduled maintenance starts at '),
      strong('22:00 UTC'),
      text('. Anything you are saving when it begins may be interrupted.'),
    ],
  },
  {
    id: 'warning-2',
    severity: 'warning',
    message: [
      strong('Market Plan'),
      text(' has 14 unsaved changes. Leaving this page will discard them.'),
    ],
  },
  {
    id: 'warning-3',
    severity: 'warning',
    message: [text('Your session expires in '), strong('10 minutes'), text('. Save your work to stay signed in.')],
  },
  {
    id: 'info-1',
    severity: 'info',
    message: [
      text('Planning data was last refreshed '),
      strong('12 minutes ago'),
      text('. Forecast views update at the top of the hour.'),
    ],
  },
  {
    id: 'info-2',
    severity: 'info',
    message: [
      strong('Exponential Smoothing'),
      text(' now supports seasonal decomposition. See what is new in this release.'),
    ],
  },
  {
    id: 'success-1',
    severity: 'success',
    message: [
      text('Your export is ready. '),
      strong('Market Plan.xlsx'),
      text(' has been added to your downloads.'),
    ],
  },
]

export const firstAlertOf = (severity) => ALERTS.find((a) => a.severity === severity)

/** Where the reader starts, and the alert each banner shows until they move. */
export const INITIAL_CURSOR = ALERTS[0].id
export const initialSeen = () =>
  Object.fromEntries(SEVERITIES.map((s) => [s.id, firstAlertOf(s.id).id]))

/**
 * Everything the stack needs, from what has been dismissed and where the reader
 * is.
 *
 * `stack` is the live severities turned until the one the reader is in comes
 * first. Index 0 is the banner in front; the last is furthest back. Moving into
 * another severity therefore brings that one to the front and sends the one just
 * left to the back:
 *
 *     [error, warning, info, success]   reading an error
 *     [warning, info, success, error]   Next into the first warning
 *
 * Turned rather than "move the old one to the end", so it is reversible:
 * Previous from there gives back exactly the stack above. If moving the previous
 * banner to the end were the whole rule, going forward and then back would leave
 * a different stack from the one you started with.
 */
export function deriveStack(dismissed, cursor) {
  /* `dismissed` is alert ids. A severity is live while it has an alert left. */
  const liveAlerts = ALERTS.filter((a) => !dismissed.includes(a.id))
  const liveSeverities = SEVERITIES.map((s) => s.id).filter((id) =>
    liveAlerts.some((a) => a.severity === id)
  )
  const index = Math.max(0, liveAlerts.findIndex((a) => a.id === cursor))
  const active = liveAlerts[index]?.severity ?? null
  const at = liveSeverities.indexOf(active)
  const stack =
    at < 0 ? [] : [...liveSeverities.slice(at), ...liveSeverities.slice(0, at)]
  return { liveSeverities, liveAlerts, index, active, stack }
}

/**
 * Dismissing one alert: what the reader sees next, and what every banner shows.
 *
 * The reader lands on the alert that slides into the dismissed one's place -- the
 * next in the sequence, or the previous when it was the last. A banner that is
 * left behind with alerts still in it must not be left showing the one that was
 * just removed, so it moves to the nearest alert it still has.
 */
export function afterDismiss(id, dismissed, seen) {
  const before = ALERTS.filter((a) => !dismissed.includes(a.id))
  const at = before.findIndex((a) => a.id === id)
  const after = before.filter((a) => a.id !== id)
  const target = after[at] ?? after[at - 1] ?? null

  const nextSeen = { ...seen }
  const gone = ALERTS.find((a) => a.id === id)
  const mates = after.filter((a) => a.severity === gone.severity)
  if (mates.length && seen[gone.severity] === id) {
    const pos = before.filter((a) => a.severity === gone.severity).findIndex((a) => a.id === id)
    nextSeen[gone.severity] = (mates[pos] ?? mates[pos - 1]).id
  }
  if (target) nextSeen[target.severity] = target.id
  return {
    target,
    seen: nextSeen,
    emptied: mates.length === 0,
    remaining: after,
  }
}
