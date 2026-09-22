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
 * Severity.
 *
 * One mark, not two. This used to render an o9con glyph beside the badge, on
 * the reasoning that a shape survives greyscale and colour-blindness where a
 * tint does not. That reasoning was already satisfied: ArvoBadge carries its
 * own semantic icon AND the word "Critical". The extra glyph was a third
 * encoding of something already said twice, and in a dense table it read as
 * decoration -- two dots and a word per cell, in every row.
 *
 * Colour is never the only channel here, because the label is always present.
 */
export function SeverityMark({ severity }) {
  const row = SEVERITY[severity]
  if (!row) return severity
  return <Mark label={row.label} semantic={row.semantic} />
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
/**
 * The segments of a stacked bar, with a hairline gap between them.
 *
 * Zero-value bands are DROPPED rather than rendered at `width: 0`. The gap is a
 * left border on every segment after the first, so a zero-width band would draw
 * its separator anyway -- two touching lines in the middle of a bar that is
 * otherwise one colour, which reads as a band of something that is not there.
 *
 * The border is inside the width (`box-sizing: border-box` is global), so the
 * segments still sum to exactly 100%.
 */
function Segments({ bands, total }) {
  return bands
    .filter((b) => b.value > 0)
    .map((b) => (
      <span
        key={b.id}
        className={`trk-mig__seg trk-mig__seg--${b.id}`}
        style={{ width: `${total ? (b.value / total) * 100 : 0}%` }}
      />
    ))
}

export function MigrationBar({ area }) {
  const { total, migrated, partial, legacy, blocked } = area
  return (
    <div
      className="trk-mig"
      role="img"
      aria-label={`${migrated} migrated, ${partial} partially migrated, ${legacy} legacy, ${blocked} blocked, of ${total}`}
    >
      <Segments
        total={total}
        bands={[
          { id: 'migrated', value: migrated },
          { id: 'partial', value: partial },
          { id: 'legacy', value: legacy },
          { id: 'blocked', value: blocked },
        ]}
      />
    </div>
  )
}

/**
 * Arvo against legacy, in one bar.
 *
 * Two parts of a whole, so a data mark: ArvoVisualPalette, not the semantic
 * palette. Deliberately NOT green-versus-red. Legacy code is not an error -- it
 * is work that has not happened yet, and most of it predates the component that
 * would replace it. Tinting it as a failure would make this read as a list of
 * mistakes, which is wrong and is also the fastest way to make people stop
 * looking at the screen.
 *
 * The counts are in the accessible name, so the split never has to be read off
 * the colours.
 */
export function AdoptionBar({ arvo, legacy }) {
  const total = arvo + legacy
  return (
    <div
      className="trk-mig"
      role="img"
      aria-label={`${arvo} Arvo component uses, ${legacy} legacy, of ${total}`}
    >
      <Segments
        total={total}
        bands={[
          { id: 'migrated', value: arvo },
          { id: 'legacy', value: legacy },
        ]}
      />
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
