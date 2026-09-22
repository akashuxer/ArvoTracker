import { useMemo, useState } from 'react'
import { ArvoButton, ArvoSelect, ArvoNumberInput } from '@arvo/react'

/**
 * Numeric filters on a table's own columns: "P90 >= 2000", "Error % > 0".
 *
 * The Jinja pages put an operator select and a `Val` box under every numeric
 * column header, which is a dozen controls competing with the data. This is
 * the same capability as one row of controls you add to: pick a column, pick
 * a comparison, type a number. Rules are AND-ed, because that is what
 * narrowing means -- each one you add asks for less, never more.
 */

export const OPERATORS = [
  { id: 'gte', value: 'gte', label: '≥', test: (v, n) => v >= n },
  { id: 'gt', value: 'gt', label: '>', test: (v, n) => v > n },
  { id: 'lte', value: 'lte', label: '≤', test: (v, n) => v <= n },
  { id: 'lt', value: 'lt', label: '<', test: (v, n) => v < n },
  { id: 'eq', value: 'eq', label: '=', test: (v, n) => v === n },
]

/** Apply every rule to a row. A rule whose column has no value never matches. */
export function matchesRules(row, rules, columns) {
  return rules.every((rule) => {
    const column = columns.find((c) => c.key === rule.column)
    if (!column) return true
    const raw = column.sortValue ? column.sortValue(row) : row[column.key]
    const value = Number(raw)
    if (!Number.isFinite(value)) return false
    const op = OPERATORS.find((o) => o.value === rule.op)
    return op ? op.test(value, rule.value) : true
  })
}

export default function ColumnFilters({ columns, rules, onChange }) {
  const [draft, setDraft] = useState({ column: '', op: 'gte', value: '' })

  /* Only columns that hold a number can be compared with one. */
  const numericColumns = useMemo(
    () => columns.filter((c) => c.label && (c.sortValue || typeof c.key === 'string')),
    [columns]
  )

  const canAdd = draft.column && draft.value !== '' && Number.isFinite(Number(draft.value))

  return (
    <div className="col-filters">
      <div className="col-filters__row">
        <ArvoSelect
          label="Column"
          items={numericColumns.map((c) => ({ id: c.key, value: c.key, label: c.label }))}
          value={draft.column}
          placeholder="Choose a column…"
          onChange={({ value }) => setDraft((d) => ({ ...d, column: value }))}
        />
        <ArvoSelect
          label="Is"
          items={OPERATORS}
          value={draft.op}
          onChange={({ value }) => setDraft((d) => ({ ...d, op: value }))}
        />
        <ArvoNumberInput
          label="Value"
          placeholder="e.g. 2000"
          value={draft.value}
          width="120px"
          onChange={({ value }) => setDraft((d) => ({ ...d, value: value ?? '' }))}
        />
        <ArvoButton
          variant="secondary"
          size="md"
          label="Add filter"
          icon="plus"
          isDisabled={!canAdd}
          onClick={() => {
            onChange([...rules, { ...draft, value: Number(draft.value) }])
            setDraft({ column: '', op: 'gte', value: '' })
          }}
        />
      </div>

      {rules.length > 0 && (
        <div className="col-filters__active">
          {rules.map((rule, i) => {
            const column = columns.find((c) => c.key === rule.column)
            const op = OPERATORS.find((o) => o.value === rule.op)
            return (
              <span className="col-filters__rule" key={`${rule.column}-${i}`}>
                {column?.label ?? rule.column} {op?.label} {rule.value}
                <button
                  type="button"
                  className="col-filters__remove"
                  aria-label={`Remove filter ${column?.label} ${op?.label} ${rule.value}`}
                  onClick={() => onChange(rules.filter((_, j) => j !== i))}
                >
                  <span className="o9con o9con-close" aria-hidden="true" />
                </button>
              </span>
            )
          })}
          <ArvoButton variant="inline" size="sm" label="Clear all" onClick={() => onChange([])} />
        </div>
      )}
    </div>
  )
}
