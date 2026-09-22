/**
 * A dense numeric matrix with a totals row.
 *
 * Deliberately not DataTable: these matrices are a fixed cross-tabulation
 * (category x bucket) whose row order is meaningful and whose last row is an
 * aggregate. Sorting them would move the totals row into the middle and break
 * the reading order the numbers depend on.
 */
export default function MatrixTable({ columns, rows, totalRow, emptyMessage = 'Nothing to show.' }) {
  if (!rows?.length) return <p className="data-table__muted matrix-table__empty">{emptyMessage}</p>

  const cell = (col, row) => {
    const v = col.value(row)
    if (v === null || v === undefined) return <span className="data-table__blank">—</span>
    return typeof v === 'number' ? v.toLocaleString(undefined, col.format) : v
  }

  return (
    <div className="matrix-scroll">
      <table className="data-table matrix-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.numeric ? 'matrix-table__num' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.key ?? i}>
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? 'matrix-table__num' : undefined}>
                  {cell(c, row)}
                </td>
              ))}
            </tr>
          ))}
          {totalRow && (
            <tr className="matrix-table__total">
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? 'matrix-table__num' : undefined}>
                  {cell(c, totalRow)}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
