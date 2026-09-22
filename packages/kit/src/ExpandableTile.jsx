import { ArvoIconButton } from '@arvo/react'

/**
 * A report tile that can take over the content area.
 *
 * When one tile is expanded the others are not rendered at all, rather than
 * hidden with CSS: a 46-row table and eleven Highcharts instances left mounted
 * behind a full-screen chart still cost layout and redraws on every resize.
 *
 * The KPI row stays put -- it is the context the expanded view is read
 * against, and losing it would mean expanding a chart to study it while the
 * numbers it belongs to scroll away.
 */
export default function ExpandableTile({
  id,
  title,
  expandedId,
  onToggle,
  actions,
  /* A line of explanatory text beside the title. Kept distinct from
     `actions`, which is controls: a note is not something you click. */
  note,
  /* False hides the expand control entirely. A tile with nothing in it yet
     has nothing to expand, and offering the button anyway invites a click
     that fills the screen with an empty box. */
  canExpand = true,
  children,
  className = '',
}) {
  const isExpanded = expandedId === id
  // Another tile owns the screen.
  if (expandedId && !isExpanded) return null

  return (
    <section
      className={`report-tile${isExpanded ? ' report-tile--full' : ''}${className ? ` ${className}` : ''}`}
    >
      <div className="tile-header">
        <h2 className="tile-title">{title}</h2>
        {note && <span className="tile-note">{note}</span>}
        <div className="tile-actions">
          {actions}
          {canExpand && (
          <ArvoIconButton
            icon={isExpanded ? 'full-screen-exit' : 'full-screen'}
            tooltip={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
            variant="tertiary"
            size="sm"
            onClick={() => onToggle(isExpanded ? null : id)}
          />
          )}
        </div>
      </div>
      {children}
    </section>
  )
}
