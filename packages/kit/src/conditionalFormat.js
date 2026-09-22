/**
 * Conditional formatting rules for the comparison tables.
 *
 * Every rule here is transcribed from `templates/View3_compare.html`, which is
 * the template `/compare` actually renders -- the screen the React comparison
 * replaces. They are deliberately inconsistent with each other, and that is
 * not an accident to be tidied up:
 *
 *   - the absolute delta needs BOTH a 10% swing and a 50ms move, so a large
 *     percentage change on a 2ms call does not read as a regression
 *   - the percentage delta fills at 15% on its own
 *   - error rate is judged in absolute points, not percent-of-percent: half a
 *     point more failures matters however small the base rate was
 *
 * Keep this file and the template in step. If one changes, the two UIs
 * disagree about what counts as a regression, which is worse than either
 * rule being wrong.
 *
 * `metric-degraded` / `metric-improved` in the template map to
 * `cf-fill--negative` / `cf-fill--positive` here.
 */

export const NEGATIVE = 'cf-fill--negative'
export const POSITIVE = 'cf-fill--positive'

/** Absolute response-time delta: 10% AND 50ms, agreeing in sign. */
export function timeDeltaFill(pct, val) {
  if (pct == null || val == null) return ''
  if (pct > 10 && val > 50) return NEGATIVE
  if (pct < -10 && val < -50) return POSITIVE
  return ''
}

/** Percentage delta, for response time and for sample count. */
export function pctDeltaFill(pct) {
  if (pct == null) return ''
  if (pct > 15) return NEGATIVE
  if (pct < -15) return POSITIVE
  return ''
}

/** Error-rate delta, in percentage POINTS rather than percent. */
export function errorDeltaFill(points) {
  if (points == null) return ''
  if (points > 0.5) return NEGATIVE
  if (points < -0.5) return POSITIVE
  return ''
}

/**
 * An error rate on its own, base or target. Text only, never a fill: it is a
 * level rather than a change, and filling every error cell would drown the
 * deltas that the eye is meant to land on.
 */
export function errorLevelClass(pct) {
  if (pct == null) return ''
  if (pct >= 1) return 'cf-text--negative'
  if (pct > 0) return 'cf-text--caution'
  return ''
}

/**
 * Infrastructure delta: text only, and no threshold -- any movement in CPU or
 * memory is worth seeing, and these are already aggregates.
 */
export function infraDeltaClass(delta) {
  if (delta == null) return ''
  if (delta > 0) return 'cf-text--negative'
  if (delta < 0) return 'cf-text--positive'
  return ''
}
