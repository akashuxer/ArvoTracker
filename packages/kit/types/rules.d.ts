/** The conditional-formatting rules on their own -- no React, no JSX, so a
 *  Node script or a backend test can import them to check a threshold. */
export const NEGATIVE: 'cf-fill--negative'
export const POSITIVE: 'cf-fill--positive'
export function timeDeltaFill(pct: number | null, val: number | null): string
export function pctDeltaFill(pct: number | null): string
export function errorDeltaFill(points: number | null): string
export function errorLevelClass(pct: number | null): string
export function infraDeltaClass(delta: number | null): string
