import { ArvoBadge, ArvoIconButton } from '@arvo/react'
import { PRIORITY, SEVERITY, STATUS, TYPE, VIOLATION_STATUS } from '../data/enums'

/**
 * The small marks every table and drawer reuses.
 *
 * All of them are INTERFACE STATE, so all of them take Arvo's semantic palette
 * through ArvoBadge's `semanticType`. None reaches for ArvoVisualPalette -- a
 * severity is not a data mark, and tinting it with a chart red would couple the
 * two so that retuning the charts restyles every severity in the product.
 *
 * Each one carries a word or a shape as well as a tone, so nothing here depends
 * on colour alone.
 */

/* Arvo's badge has no "no tone" value; `colorMode="default"` is how a neutral
   badge is asked for, and passing semanticType alongside it would be ignored. */
function Mark({ label, semantic, size = 'sm' }) {
  const isNeutral = !semantic || semantic === 'none'
  return (
    <ArvoBadge
      variant="label"
      message={label}
      size={size}
      appearance="subtle"
      colorMode={isNeutral ? 'default' : 'semantic'}
      semanticType={isNeutral ? undefined : semantic}
    />
  )
}

export function StatusBadge({ status, size }) {
  const row = STATUS[status]
  return <Mark label={row?.label ?? status} semantic={row?.semantic} size={size} />
}

export function PriorityBadge({ priority, size }) {
  const row = PRIORITY[priority]
  return <Mark label={row?.label ?? priority} semantic={row?.semantic} size={size} />
}

export function ViolationStatusBadge({ status, size }) {
  const row = VIOLATION_STATUS[status]
  return <Mark label={row?.label ?? status} semantic={row?.semantic} size={size} />
}

/**
 * Severity, with its own glyph.
 *
 * The badge already carries the word, so the icon is redundant for a sighted
 * reader -- and that is the point. In a dense table scanned by shape it is the
 * fastest signal, and it is the one that survives being printed, screenshotted
 * in greyscale, or read by someone who cannot separate the reds from the ambers.
 */
export function SeverityMark({ severity }) {
  const row = SEVERITY[severity]
  if (!row) return severity
  return (
    <span className="trk-severity">
      <span className={`o9con o9con-${row.icon} trk-severity__ico trk-severity__ico--${row.id}`} aria-hidden="true" />
      <Mark label={row.label} semantic={row.semantic} />
    </span>
  )
}

export function TypeMark({ type }) {
  const row = TYPE[type]
  if (!row) return type
  return (
    <span className="trk-type">
      <span className={`o9con o9con-${row.icon} trk-type__ico`} aria-hidden="true" />
      {row.label}
    </span>
  )
}

/**
 * A migration bar.
 *
 * This one IS a data mark -- four measured parts of a whole -- so it takes
 * ArvoVisualPalette through the --arvo-viz-* variables the kit publishes, not
 * the semantic palette. Every segment is labelled in the accessible name, so
 * the four bands never have to be told apart by colour.
 */
export function MigrationBar({ area }) {
  const { total, migrated, partial, legacy, blocked } = area
  const pct = (n) => (total ? (n / total) * 100 : 0)
  return (
    <div
      className="trk-mig"
      role="img"
      aria-label={`${migrated} migrated, ${partial} partially migrated, ${legacy} legacy, ${blocked} blocked, of ${total}`}
    >
      <span className="trk-mig__seg trk-mig__seg--migrated" style={{ width: `${pct(migrated)}%` }} />
      <span className="trk-mig__seg trk-mig__seg--partial" style={{ width: `${pct(partial)}%` }} />
      <span className="trk-mig__seg trk-mig__seg--legacy" style={{ width: `${pct(legacy)}%` }} />
      <span className="trk-mig__seg trk-mig__seg--blocked" style={{ width: `${pct(blocked)}%` }} />
    </div>
  )
}

/**
 * The explanation for a metric whose name is not self-evident.
 *
 * An ArvoIconButton rather than a bare `title`: it takes focus, so the
 * explanation is reachable from the keyboard, and the tooltip prop sets the
 * accessible name at the same time.
 */
export function Hint({ text }) {
  return (
    <ArvoIconButton
      className="trk-hint"
      icon="info-circle"
      tooltip={text}
      variant="tertiary"
      size="sm"
    />
  )
}

/* ---- Formatting --------------------------------------------------------- */

const DATE = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

/** Dates are shown, never invented: an absent one stays absent so DataTable's
 *  own em dash reports it rather than a fabricated "—" or "TBD". */
export const fmtDate = (value) => (value ? DATE.format(new Date(value)) : '')

export const fmtDateTime = (value) =>
  value ? `${DATE.format(new Date(value))} ${new Date(value).toISOString().slice(11, 16)}` : ''

export function daysUntil(value) {
  if (!value) return null
  return Math.round((new Date(value).getTime() - Date.now()) / 86_400_000)
}

/** "just now", "12d ago" -- how stale the news is, which is what matters here. */
export function timeAgo(value) {
  if (!value) return ''
  const d = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  const m = Math.floor(d / 30)
  return `${m}mo ago`
}
