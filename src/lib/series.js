/**
 * Time bucketing and period-over-period comparison.
 *
 * Shared, because "last month" has to mean exactly one thing. Several screens
 * quote period-over-period movement and the sparkline behind each KPI draws the
 * same series; if each worked out its own boundaries, a KPI and the chart under
 * it would disagree by a day and nobody could say which was right.
 *
 * Everything anchors to `TODAY` from the fixtures rather than `Date.now()`, so
 * a screenshot stays true and two people see the same numbers.
 */
import { TODAY } from '../data/mock'

export const DAY = 86_400_000

/**
 * The grains a reader can switch between.
 *
 * `count` is how many buckets that grain shows. They are not the same number on
 * purpose: twelve months reads as a year, twelve quarters would be three years
 * of data this app does not have, and twelve years is absurd.
 */
export const GRAINS = [
  { id: 'month', short: 'M', label: 'Monthly', axis: 'Month', count: 12, vs: 'vs same point last month' },
  { id: 'quarter', short: 'Q', label: 'Quarterly', axis: 'Quarter', count: 8, vs: 'vs same point last quarter' },
  { id: 'year', short: 'Y', label: 'Yearly', axis: 'Year', count: 3, vs: 'vs same point last year' },
]

export const GRAIN = Object.fromEntries(GRAINS.map((g) => [g.id, g]))

/* ---- Buckets ------------------------------------------------------------ */

/** UTC midnight on the first day of the bucket this date falls in. */
export function keyOf(value, grain) {
  const d = new Date(value)
  const y = d.getUTCFullYear()
  if (grain === 'year') return Date.UTC(y, 0, 1)
  if (grain === 'quarter') return Date.UTC(y, Math.floor(d.getUTCMonth() / 3) * 3, 1)
  return Date.UTC(y, d.getUTCMonth(), 1)
}

const MONTH_LABEL = new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })

export function labelFor(key, grain) {
  const d = new Date(key)
  if (grain === 'year') return String(d.getUTCFullYear())
  if (grain === 'quarter') {
    return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${String(d.getUTCFullYear()).slice(2)}`
  }
  return MONTH_LABEL.format(d)
}

/**
 * The last `count` buckets ending with the one TODAY falls in, including any
 * that are empty.
 *
 * Generated from the calendar rather than from the data, which is the point: a
 * month with no violations is a real and interesting month, and a chart built
 * only from keys that appear in the data silently closes that gap and draws a
 * straight line through it.
 */
export function periods(grain, count = GRAIN[grain].count) {
  const now = new Date(TODAY)
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const out = []
  for (let i = count - 1; i >= 0; i -= 1) {
    if (grain === 'year') out.push(Date.UTC(y - i, 0, 1))
    else if (grain === 'quarter') out.push(Date.UTC(y, Math.floor(m / 3) * 3 - i * 3, 1))
    else out.push(Date.UTC(y, m - i, 1))
  }
  return out
}

/**
 * Count rows into buckets.
 *
 * `dateOf` says which field puts a row in a bucket -- a violation is counted by
 * when it was DETECTED in one chart and by when it was RESOLVED in another, and
 * those are different questions about the same row.
 */
export function bucketCount(rows, grain, dateOf, count) {
  return bucketBy(rows, grain, dateOf, (r) => r.length, count)
}

/** Bucket, then reduce each bucket with your own function. For ratios. */
export function bucketBy(rows, grain, dateOf, reduce, count = GRAIN[grain].count) {
  const keys = periods(grain, count)
  const groups = new Map(keys.map((k) => [k, []]))
  rows.forEach((row) => {
    const at = dateOf(row)
    if (!at) return
    const k = keyOf(at, grain)
    if (groups.has(k)) groups.get(k).push(row)
  })
  return {
    keys,
    labels: keys.map((k) => labelFor(k, grain)),
    values: keys.map((k) => reduce(groups.get(k), k)),
  }
}

/* ---- Movement ----------------------------------------------------------- */

/**
 * The last bucket against the one before it.
 *
 * For a SNAPSHOT -- a running balance, a migration total, anything already
 * measured at a point in time. For a FLOW, use `toDate` instead; see why there.
 *
 * `higherIsBetter` is DECLARED by the caller, never inferred from the sign. A
 * rise in resolved violations is good; an identical rise in detected violations
 * is not. Only the caller knows which measure it is holding.
 *
 * `pct` is null when the previous bucket was zero -- the change from nothing to
 * something has no percentage, and "+100%" or "+Infinity%" is a lie either way.
 * Callers fall back to the absolute move.
 */
export function movement(series, { higherIsBetter = true } = {}) {
  const values = series.values ?? series
  const current = values[values.length - 1] ?? 0
  const previous = values[values.length - 2] ?? 0
  const change = current - previous
  const pct = previous === 0 ? null : Math.round((change / previous) * 100)
  return {
    current,
    previous,
    change,
    pct,
    favourability:
      change === 0 ? undefined : (change > 0) === higherIsBetter ? 'favorable' : 'unfavorable',
  }
}

/**
 * This period so far, against the SAME SLICE of the period before it.
 *
 * The fix for the most common lie a dashboard tells. On the 22nd of the month,
 * comparing a 22-day month against a complete one reported every flow measure
 * as down 40-50% -- merged PRs, Arvo uses, findings detected, all of it -- and
 * every one of those numbers was wrong. Nothing had fallen off a cliff; the
 * month simply was not over.
 *
 * So the previous period is cut to the same elapsed span. Twenty-two days
 * against twenty-two days. Callers label it "vs same point last month" rather
 * than "vs last month", because those are different claims.
 *
 * Only for FLOW measures -- things that accumulate within a period, like PRs
 * merged or violations detected. A BALANCE (how many are open right now) or a
 * SNAPSHOT (components migrated to date) is already a point in time and belongs
 * on `movement`.
 */
export function toDate(rows, grain, dateOf, { higherIsBetter = true, reduce } = {}) {
  const now = TODAY.getTime()
  const d = new Date(TODAY)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()

  const startCurrent =
    grain === 'year'
      ? Date.UTC(y, 0, 1)
      : grain === 'quarter'
        ? Date.UTC(y, Math.floor(m / 3) * 3, 1)
        : Date.UTC(y, m, 1)

  const startPrevious =
    grain === 'year'
      ? Date.UTC(y - 1, 0, 1)
      : grain === 'quarter'
        ? Date.UTC(y, Math.floor(m / 3) * 3 - 3, 1)
        : Date.UTC(y, m - 1, 1)

  const elapsed = now - startCurrent
  const endPrevious = startPrevious + elapsed

  const within = (from, to) =>
    rows.filter((r) => {
      const at = dateOf(r)
      if (!at) return false
      const t = new Date(at).getTime()
      return t >= from && t < to
    })

  const measure = reduce ?? ((rs) => rs.length)
  const current = measure(within(startCurrent, now + 1)) ?? 0
  const previous = measure(within(startPrevious, endPrevious)) ?? 0

  const change = current - previous
  const pct = previous === 0 ? null : Math.round((change / previous) * 100)
  return {
    current,
    previous,
    change,
    pct,
    favourability:
      change === 0 ? undefined : (change > 0) === higherIsBetter ? 'favorable' : 'unfavorable',
    elapsedDays: Math.max(1, Math.round(elapsed / DAY)),
  }
}

/** "+12%", "−4pp", or "+3" when there is no percentage to state. */
export function formatMovement({ change, pct }, unit = '') {
  if (change === 0) return 'no change'
  const sign = change > 0 ? '+' : '−'
  const size = Math.abs(pct ?? change)
  return `${sign}${size}${pct === null ? unit : '%'}`
}
