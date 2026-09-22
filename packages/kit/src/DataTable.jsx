import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ArvoContextMenu, ArvoEmptyState, useArvoToast } from '@arvo/react'
import useContextMenuOpen from './useContextMenuOpen'

/**
 * Sortable table.
 *
 * Columns are declared once and drive both the header and the cells, so a
 * column can never sort by one value while displaying another.
 *
 *   { key, label, render?, sortValue?, className?, isSortable? }
 *
 * `sortValue` is what the column sorts BY -- durations sort numerically while
 * displaying "24h 49m", IDs sort numerically while displaying "#38". Without
 * it, "#9" would sort after "#38".
 */
/**
 * A cell with no value shows an em dash, never a word.
 *
 * "N/A", "None", "Unknown" and "" all read as data, and a reader cannot tell
 * which of them means "we have no value" versus "the value is literally that".
 * One neutral mark, applied here rather than per column, keeps every table
 * saying the same thing. `0` and `false` ARE values and pass through.
 */
/* Words the backend uses to mean "nothing". They arrive as real strings, so
   without this list a cell reads "N/A" while the cell beside it reads "—". */
const ABSENT = new Set(['', '-', 'n/a', 'na', 'none', 'null', 'undefined', 'nan'])

/* Numbers align right, text aligns left.
 *
 * Right-aligned digits put units under units, which is the only way a column
 * of figures can be scanned for magnitude -- "1,082" over "837" over "41,540"
 * only compares at a glance when the last digits line up. Text has no such
 * structure and reads from its start, so it stays left.
 *
 * Inferred from the data rather than declared per column: every numeric column
 * in this app already renders formatted numbers, and a flag on each of the
 * ~90 column definitions would be one more thing to forget. Counts, currency,
 * percentages and deltas all match; an id like "#16" deliberately does not,
 * because it is a label that happens to contain digits. */
const NUMERIC = /^[-+]?[\d,]+(\.\d+)?\s*%?$/

function isNumericColumn(column, rows) {
  if (column.align) return column.align === 'right'
  /* Monospaced columns are identifiers and timestamps. Both are made of digits
     and neither is a magnitude, so right-aligning them would line up the ends
     of things that are never compared by size. */
  if (String(column.className ?? '').includes('data-table__mono')) return false
  const sample = rows.slice(0, 12)
  let seen = 0
  let numeric = 0
  for (const row of sample) {
    let v = column.render ? column.render(row) : row[column.key]
    /* A render that returns an element (a tinted delta, a badge) tells us
       nothing about its own shape, so fall back to what the column sorts or
       searches by -- which is the underlying value either way. Without this,
       every column that colours its number stayed left-aligned. */
    if (v !== null && v !== undefined && typeof v !== 'string' && typeof v !== 'number') {
      v = column.sortValue ? column.sortValue(row) : row[column.key]
    }
    if (typeof v !== 'string' && typeof v !== 'number') continue
    const text = String(v).trim()
    if (!text || ABSENT.has(text.toLowerCase())) continue
    seen += 1
    if (NUMERIC.test(text)) numeric += 1
  }
  /* A column has to be mostly numbers, not incidentally so. */
  return seen > 0 && numeric / seen >= 0.8
}

function orDash(content) {
  const isBlank =
    content === null ||
    content === undefined ||
    (typeof content === 'string' && ABSENT.has(content.trim().toLowerCase()))
  return isBlank ? <span className="data-table__blank" aria-label="No value">—</span> : content
}

export default function DataTable({
  columns,
  rows,
  rowKey,
  emptyMessage = 'Nothing to show.',
  /* Shown instead of a bare message when there is nothing to display.
     `query` distinguishes "your search found nothing" from "there is nothing
     here yet" -- different situations that deserve different words. */
  emptyTitle,
  query = '',
  emptyIllustration,
  /* Optional expandable row. Returns the detail content for a row, or null
     when that row is collapsed. Kept here rather than in the view so an
     expandable table is still a sortable, searchable one. */
  rowDetail,
  /* Right-click actions. Each is optional and the menu only offers what the
     screen actually supports, so a read-only table gets Show details and Copy
     and no misleading Edit. Copy is always offered -- it needs nothing from
     the view. */
  rowActions,
  /* An extra class per row, for tables that mark a kind of row rather than a
     value -- a transaction against the samplers beneath it, for instance. */
  rowClassName,
}) {
  const [sort, setSort] = useState(null)
  const tableRef = useRef(null)
  /* The row the menu was opened on. Held in a ref, not state: re-rendering the
     table on right-click would move the row out from under the menu. */
  const targetRow = useRef(null)
  const toast = useArvoToast()

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const value = (row) => {
      const v = col.sortValue ? col.sortValue(row) : row[col.key]
      return v === null || v === undefined ? '' : v
    }
    return [...rows].sort((a, b) => {
      const x = value(a)
      const y = value(b)
      const cmp =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y), undefined, { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort, columns])

  /* Built per open so the menu reflects the row, not the table in general. */
  const menuItems = useMemo(() => {
    if (!rowActions) return []
    const items = []
    if (rowActions.onShowDetails) items.push({ id: 'details', label: 'Show details', icon: 'eye' })
    items.push({ id: 'copy', label: 'Copy row', icon: 'copy' })
    if (rowActions.onEdit) items.push({ id: 'edit', label: 'Edit', icon: 'pencil' })
    if (rowActions.onDelete) items.push({ id: 'delete', label: 'Delete', icon: 'bin' })
    return items
  }, [rowActions])

  async function copyRow(row) {
    /* Tab separated, so it pastes straight into a spreadsheet as cells rather
       than as one string. Headers included -- a row of bare numbers out of
       context is not worth pasting. */
    const cols = columns.filter((c) => c.label)
    const text =
      cols.map((c) => c.label).join('\t') +
      '\n' +
      cols
        .map((c) => {
          const v = c.searchValue ? c.searchValue(row) : c.sortValue ? c.sortValue(row) : row[c.key]
          return v === null || v === undefined ? '' : String(v)
        })
        .join('\t')
    try {
      await navigator.clipboard.writeText(text)
      toast.show({ type: 'positive', title: 'Row copied' })
    } catch {
      toast.show({ type: 'info', title: 'Copy unavailable', message: 'Select the row manually.' })
    }
  }

  const { className: menuClass, onOpenChange } = useContextMenuOpen((index) => {
    const picked = menuItems[index]
    const row = targetRow.current
    if (!picked || !row) return
    if (picked.id === 'details') rowActions.onShowDetails(row)
    else if (picked.id === 'copy') copyRow(row)
    else if (picked.id === 'edit') rowActions.onEdit(row)
    else if (picked.id === 'delete') rowActions.onDelete(row)
  })

  /* Suppressed across the whole table, not just on cells: right-clicking the
     gap between them otherwise produced the browser's own menu, so the gesture
     behaved differently depending on the exact pixel. */
  useEffect(() => {
    const el = tableRef.current
    if (!el || !rowActions) return undefined
    const block = (event) => event.preventDefault()
    el.addEventListener('contextmenu', block)
    return () => el.removeEventListener('contextmenu', block)
  }, [rowActions])

  /* Computed from the rows on screen, so a column whose values change shape
     (a delta that starts showing "—") settles on one alignment per render
     rather than per cell. */
  const alignRight = useMemo(
    () => new Set(columns.filter((c) => isNumericColumn(c, rows)).map((c) => c.key)),
    [columns, rows]
  )

  function toggle(key) {
    setSort((s) => {
      if (s?.key !== key) return { key, dir: 'asc' }
      // asc -> desc -> unsorted, so the original order is always reachable.
      return s.dir === 'asc' ? { key, dir: 'desc' } : null
    })
  }

  return (
    /* Tables scroll inside their tile. A wide one (many metric columns, or a
       row-action column that does not fit) would otherwise stretch the tile,
       the column and the whole shell sideways. */
    <div className="table-scroll" ref={tableRef}>
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((c) => {
            const isSorted = sort?.key === c.key
            const sortable = c.isSortable !== false
            return (
              <th
                key={c.key}
                className={[c.headerClassName, alignRight.has(c.key) && 'data-table__num']
                  .filter(Boolean)
                  .join(' ')}
              >
                {sortable && c.label ? (
                  <button
                    type="button"
                    className={`th-sort${isSorted ? ' th-sort--on' : ''}`}
                    aria-sort={isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => toggle(c.key)}
                  >
                    {c.label}
                    <span
                      className={`o9con o9con-${
                        isSorted ? (sort.dir === 'asc' ? 'caret-up' : 'caret-down') : 'arrows-v'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  c.label
                )}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => {
          const key = rowKey ? rowKey(row) : i
          const detail = rowDetail?.(row)
          return (
            <Fragment key={key}>
              <tr
                className={rowClassName?.(row) || undefined}
                onContextMenu={() => { targetRow.current = row }}
              >
                {columns.map((c) => {
                  const content = c.render ? c.render(row) : row[c.key]
                  /* The full value on `title`, so clamping never loses it.
                     Only for plain values -- an element already carries its
                     own markup and often its own title. */
                  const full = typeof content === 'string' || typeof content === 'number'
                    ? String(content)
                    : undefined
                  return (
                    <td
                      key={c.key}
                      className={[c.className, alignRight.has(c.key) && 'data-table__num']
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="data-table__cell" title={full}>
                        {orDash(content)}
                      </span>
                    </td>
                  )
                })}
              </tr>
              {detail && (
                <tr className="row-detail">
                  <td colSpan={columns.length}>{detail}</td>
                </tr>
              )}
            </Fragment>
          )
        })}
        {!sorted.length && (
          <tr>
            <td colSpan={columns.length} className="data-table__empty">
              <ArvoEmptyState
                size="sm"
                illustration={
                  emptyIllustration ?? (query ? 'no-results-found' : 'no-report')
                }
                title={emptyTitle ?? (query ? 'No matches' : 'Nothing here yet')}
                message={emptyMessage}
              />
            </td>
          </tr>
        )}
      </tbody>
    </table>

    {rowActions && menuItems.length > 0 && (
      <ArvoContextMenu
        targetRef={tableRef}
        // Only body cells open a menu -- a header has no row to act on.
        contextSelector="tbody td"
        items={menuItems}
        className={menuClass}
        onOpenChange={onOpenChange}
        ariaLabel="Row actions"
      />
    )}
    </div>
  )
}

/**
 * Free-text match across EVERY column's value, not a hand-picked subset.
 *
 * Uses each column's `searchValue` (falling back to `sortValue`, then the raw
 * field) so a row matches on what the column means, including values that are
 * rendered as elements rather than text.
 */
export function matchesQuery(row, columns, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return columns.some((c) => {
    const v = c.searchValue ? c.searchValue(row) : c.sortValue ? c.sortValue(row) : row[c.key]
    return v !== null && v !== undefined && String(v).toLowerCase().includes(q)
  })
}
