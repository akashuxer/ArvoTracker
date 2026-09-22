import { useMemo } from 'react'
import { ArvoEmptyState } from '@arvo/react'
import { PRIORITY, STATUSES } from '../data/enums'
import { TEAM } from '../data/mock'
import { PriorityBadge, TypeMark } from '../components/marks'

/**
 * The same filtered rows as the table, grouped by status.
 *
 * Read-only on purpose. Drag-to-change-status looks like the obvious feature and
 * is the wrong one here: a status change is a decision that wants a reason
 * recorded against it, and a drag records nothing. Moving an item goes through
 * the edit form, which appends to the decision history.
 *
 * Columns: the eight pipeline stages always, so the flow is legible even when a
 * stage is empty, plus any outcome state (Released, Blocked, Deferred) that
 * actually holds something. Giving all eleven their own column made the board
 * mostly empty air.
 */
export default function KanbanBoard({ items, onOpen }) {
  const groups = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s.id, []]))
    items.forEach((w) => byStatus[w.status]?.push(w))
    /* Highest priority first inside a column: a column is a queue, and the
       thing at the top should be the thing to pick up. */
    Object.values(byStatus).forEach((list) =>
      list.sort((a, b) => (PRIORITY[a.priority]?.rank ?? 9) - (PRIORITY[b.priority]?.rank ?? 9))
    )
    return byStatus
  }, [items])

  const columns = STATUSES.filter((s) => s.column || groups[s.id].length > 0)

  if (!items.length) {
    return (
      <div className="trk-board-empty">
        <ArvoEmptyState
          size="sm"
          illustration="no-results-found"
          title="Nothing to place on the board"
          message="No work items match the current tab and filters."
        />
      </div>
    )
  }

  return (
    <div className="trk-board">
      {columns.map((s) => (
        <section className="trk-board__col" key={s.id} aria-label={`${s.label}, ${groups[s.id].length} items`}>
          <header className="trk-board__head">
            <h3 className="trk-board__title">{s.label}</h3>
            <span className="trk-board__count">{groups[s.id].length}</span>
          </header>

          <ul className="trk-board__list">
            {groups[s.id].map((w) => (
              <li key={w.id}>
                {/* A card is a button, not a div with a click handler: it has to
                    be reachable by Tab and activate on Enter. */}
                <button type="button" className="trk-card" onClick={() => onOpen(w)}>
                  <span className="trk-card__top">
                    <span className="trk-card__id">{w.id}</span>
                    <PriorityBadge priority={w.priority} />
                  </span>
                  <span className="trk-card__title">{w.title}</span>
                  <span className="trk-card__foot">
                    <TypeMark type={w.type} />
                    <span className="trk-card__meta">
                      {w.owner || 'Unassigned'} · {TEAM[w.requestingTeam]?.name ?? ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {!groups[s.id].length && <li className="trk-board__none">Nothing at this stage</li>}
          </ul>
        </section>
      ))}
    </div>
  )
}
