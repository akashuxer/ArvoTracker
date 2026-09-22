import { useMemo, useRef, useState } from 'react'
import { ArvoEmptyState, useArvoToast } from '@arvo/react'
import { PRIORITY, STATUSES, STATUS } from '../data/enums'
import { TEAM } from '../data/mock'
import { PriorityBadge, TypeMark } from '../components/marks'
import { useTracker } from '../data/store'

/**
 * The same filtered rows as the table, grouped by status, and movable.
 *
 * Columns: the eight pipeline stages always, so the flow is legible even when a
 * stage is empty, plus any outcome state (Released, Blocked, Deferred) that
 * actually holds something. Giving all eleven their own column made the board
 * mostly empty air.
 *
 * Ordering within a column is by priority until somebody drags a card into it,
 * after which that column is explicitly ordered and stays where it was put. A
 * queue should open in the order you would work it; once a human has said
 * otherwise, the human wins.
 *
 * Dragging changes status, and the move is written to the item's decision
 * history -- see `moveWorkItem`. The earlier objection to drag-and-drop was
 * that a drag records no reason; the answer is to make the gesture say what it
 * did rather than to withhold the gesture.
 *
 * **Alt + Left/Right moves the focused card between columns**, because a board
 * that can only be operated with a mouse is the same defect as ARVO-A11Y-003,
 * which this product spends a section asking other teams not to ship.
 */
export default function KanbanBoard({ items, onOpen }) {
  const { moveWorkItem } = useTracker()
  const toast = useArvoToast()
  /* Which card is in the air, and where it would land. Held in state because
     both drive what is drawn; the id is mirrored into a ref because the
     dragover handler fires far more often than React re-renders. */
  const [dragId, setDragId] = useState(null)
  const [dropAt, setDropAt] = useState(null)
  const dragIdRef = useRef(null)

  const groups = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s.id, []]))
    items.forEach((w) => byStatus[w.status]?.push(w))
    /* A ranked card sits where it was put. An unranked one falls back to
       priority and sorts after everything ranked -- so a column nobody has
       touched is still highest-priority-first. */
    const key = (w) => (w.rank ?? 1000 + (PRIORITY[w.priority]?.rank ?? 9))
    Object.values(byStatus).forEach((list) => list.sort((a, b) => key(a) - key(b)))
    return byStatus
  }, [items])

  const columns = STATUSES.filter((s) => s.column || groups[s.id].length > 0)

  function begin(event, item) {
    dragIdRef.current = item.id
    setDragId(item.id)
    event.dataTransfer.effectAllowed = 'move'
    /* Some browsers refuse to start a drag without data on the transfer. */
    event.dataTransfer.setData('text/plain', item.id)
  }

  function end() {
    dragIdRef.current = null
    setDragId(null)
    setDropAt(null)
  }

  function drop(statusId, beforeId) {
    const id = dragIdRef.current
    end()
    if (!id) return
    const item = items.find((w) => w.id === id)
    if (!item) return
    moveWorkItem(id, statusId, beforeId)
    if (item.status !== statusId) {
      toast.show({
        type: 'positive',
        title: `${id} moved to ${STATUS[statusId]?.label ?? statusId}`,
        message: 'The move is recorded in the item’s decision history.',
      })
    }
  }

  /** Alt + arrow: the keyboard equivalent of dragging between columns. */
  function onCardKeyDown(event, item) {
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
    const order = columns.map((c) => c.id)
    const at = order.indexOf(item.status)
    const next = order[at + (event.key === 'ArrowRight' ? 1 : -1)]
    if (!next) return
    event.preventDefault()
    moveWorkItem(item.id, next, null)
    toast.show({
      type: 'positive',
      title: `${item.id} moved to ${STATUS[next]?.label ?? next}`,
      message: 'The move is recorded in the item’s decision history.',
    })
  }

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
    <>
      <p className="trk-board-hint">
        Drag a card to another column to change its status, or within a column to reorder it.
        With a card focused, <kbd>Alt</kbd> + <kbd>←</kbd> / <kbd>→</kbd> does the same. Every move
        is written to the item’s decision history.
      </p>

      <div className="trk-board">
        {columns.map((s) => {
          const isTarget = dropAt?.status === s.id
          return (
            <section
              className={`trk-board__col${isTarget ? ' trk-board__col--target' : ''}`}
              key={s.id}
              aria-label={`${s.label}, ${groups[s.id].length} items`}
              onDragOver={(event) => {
                if (!dragIdRef.current) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                /* Landing on the column itself means the end of it. A card
                   under the pointer overrides this from its own handler. */
                setDropAt((at) => (at?.status === s.id ? at : { status: s.id, before: null }))
              }}
              onDrop={(event) => {
                event.preventDefault()
                drop(s.id, dropAt?.status === s.id ? dropAt.before : null)
              }}
            >
              <header className="trk-board__head">
                <h3 className="trk-board__title">{s.label}</h3>
                <span className="trk-board__count">{groups[s.id].length}</span>
              </header>

              <ul className="trk-board__list">
                {groups[s.id].map((w) => (
                  <li key={w.id}>
                    {/* The line showing where the card would land. Drawn above
                        the card the pointer is over, which is where it goes. */}
                    {isTarget && dropAt.before === w.id && (
                      <span className="trk-board__marker" aria-hidden="true" />
                    )}
                    {/* A button, so it is reachable by Tab and activates on
                        Enter. `draggable` is added on top of that rather than
                        replacing it. */}
                    <button
                      type="button"
                      className={`trk-card${dragId === w.id ? ' trk-card--dragging' : ''}`}
                      draggable
                      onDragStart={(event) => begin(event, w)}
                      onDragEnd={end}
                      onDragOver={(event) => {
                        if (!dragIdRef.current || dragIdRef.current === w.id) return
                        event.preventDefault()
                        event.stopPropagation()
                        /* Above or below the midpoint decides whether this card
                           is the one being displaced or the one before it. */
                        const box = event.currentTarget.getBoundingClientRect()
                        const after = event.clientY > box.top + box.height / 2
                        const list = groups[s.id]
                        const i = list.findIndex((x) => x.id === w.id)
                        const before = after ? (list[i + 1]?.id ?? null) : w.id
                        setDropAt({ status: s.id, before })
                      }}
                      onKeyDown={(event) => onCardKeyDown(event, w)}
                      onClick={() => onOpen(w)}
                    >
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

                {/* The end-of-column marker, for a drop past the last card. */}
                {isTarget && dropAt.before === null && groups[s.id].length > 0 && (
                  <li>
                    <span className="trk-board__marker" aria-hidden="true" />
                  </li>
                )}

                {!groups[s.id].length && (
                  <li className="trk-board__none">
                    {isTarget ? 'Drop here' : 'Nothing at this stage'}
                  </li>
                )}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}
