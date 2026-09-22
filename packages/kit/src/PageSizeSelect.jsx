import { ArvoSelect } from '@arvo/react'

/** How many rows to show at once. `-1` is every row. */
export const PAGE_SIZES = [
  { id: '10', value: '10', label: '10 entries' },
  { id: '25', value: '25', label: '25 entries' },
  { id: '50', value: '50', label: '50 entries' },
  { id: '-1', value: '-1', label: 'All entries' },
]

export default function PageSizeSelect({ value, onChange, total, shown }) {
  return (
    <span className="page-size">
      <ArvoSelect
        ariaLabel="Rows to show"
        items={PAGE_SIZES}
        value={String(value)}
        width="140px"
        onChange={({ value: v }) => onChange(Number(v))}
      />
      {/* Says what is hidden as well as what is shown -- a table that silently
          stops at 25 rows looks like a table with 25 rows. */}
      <span className="page-size__count">
        Showing {shown} of {total}
      </span>
    </span>
  )
}
