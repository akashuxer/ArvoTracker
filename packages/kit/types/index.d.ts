/**
 * Hand-written, because the source is JSX rather than TypeScript. Any
 * TypeScript consumer typechecks against this file, so it is part
 * of the public contract: changing a prop here is a breaking change.
 */
import type { ReactNode, RefObject } from 'react'

/* ---- Tables ------------------------------------------------------------ */

export interface Column<Row = any> {
  /** Field name, and the key used for sorting and filtering. */
  key: string
  label: string
  /** Custom cell content. Without it the raw `row[key]` is shown. */
  render?: (row: Row) => ReactNode
  /** Sort by this instead of the rendered value -- needed whenever `render`
   *  returns an element, which cannot be compared. */
  sortValue?: (row: Row) => number | string
  /** Search this instead of the rendered value. */
  searchValue?: (row: Row) => string
  className?: string
  headerClassName?: string
  /** Overrides the inferred alignment. Numbers align right. */
  align?: 'left' | 'right'
}

export interface RowActions<Row = any> {
  onShowDetails?: (row: Row) => void
  onEdit?: (row: Row) => void
  onDelete?: (row: Row) => void
}

export interface DataTableProps<Row = any> {
  columns: Column<Row>[]
  rows: Row[]
  rowKey?: (row: Row) => string | number
  emptyMessage?: string
  emptyTitle?: string
  emptyIllustration?: string
  /** Highlights matches and drives the empty state's wording. */
  query?: string
  /** Expandable detail row; return null when collapsed. */
  rowDetail?: (row: Row) => ReactNode
  /** Right-click menu. Only the actions you pass are offered. */
  rowActions?: RowActions<Row>
  /** An extra class per row, for marking a KIND of row. */
  rowClassName?: (row: Row) => string
}

export function DataTable<Row = any>(props: DataTableProps<Row>): JSX.Element
export function matchesQuery<Row = any>(row: Row, columns: Column<Row>[], query: string): boolean

export interface MatrixTableProps {
  columns: Column[]
  rows: any[]
  rowKey?: (row: any) => string | number
  emptyMessage?: string
}
export function MatrixTable(props: MatrixTableProps): JSX.Element

/* ---- KPIs -------------------------------------------------------------- */

export interface KpiCellProps {
  label: string
  /** Omit when passing `ratio` -- the cell composes "count/total" itself. */
  value?: ReactNode
  unit?: string
  delta?: ReactNode
  deltaLabel?: string
  /** Stated by the caller, never inferred from a delta's sign: for latency
   *  and error rate a rise is unfavourable. */
  favourability?: 'favorable' | 'unfavorable' | 'caution'
  caption?: string
  /** Renders a sparkline of the measure over time. */
  spark?: number[]
  /** Part of a whole. The denominator is always shown. */
  ratio?: { count: number; total: number }
  /** Progress toward a stated target. Not interchangeable with `ratio`. */
  meter?: { value: number; target: number; targetLabel?: string }
}
export function KpiCell(props: KpiCellProps): JSX.Element

export function RowSparkline(props: { data: number[]; color?: string }): JSX.Element
export function RowBar(props: { value: number; max: number; tone?: string }): JSX.Element
/** Step progress: "3 / 6" with a bar. */
export function RowMeter(props: { value: number; total: number }): JSX.Element

/* ---- Charts ------------------------------------------------------------ */

/** Highcharts options. Typed loosely so a consumer is not forced to depend
 *  on Highcharts' own types. */
export function Chart(props: { options: Record<string, any>; className?: string }): JSX.Element
export function applyChartTheme(): void

/* ---- Layout ------------------------------------------------------------ */

export interface ExpandableTileProps {
  id: string
  title: ReactNode
  /** The id of the tile currently expanded, or null. */
  expandedId: string | null
  onToggle: (id: string | null) => void
  actions?: ReactNode
  note?: ReactNode
  /** False hides the expand control -- a tile with nothing in it has nothing
   *  to expand. */
  canExpand?: boolean
  className?: string
  children?: ReactNode
}
export function ExpandableTile(props: ExpandableTileProps): JSX.Element

/* ---- Filtering and paging ---------------------------------------------- */

export interface FilterRule { key: string; op: '>=' | '>' | '<=' | '<' | '='; value: number }
export function ColumnFilters(props: {
  columns: Column[]
  rules: FilterRule[]
  onChange: (rules: FilterRule[]) => void
}): JSX.Element
export function matchesRules<Row = any>(row: Row, rules: FilterRule[], columns: Column<Row>[]): boolean

/** -1 means "All". */
export function PageSizeSelect(props: {
  value: number
  onChange: (size: number) => void
  total: number
  shown: number
}): JSX.Element

/* ---- Controls ---------------------------------------------------------- */

/** ArvoButton's own isLoading is a shimmer and it renders no children, so
 *  this keeps the label and swaps the icon for a spinner. */
export function BusyButton(props: {
  label: string
  icon?: string
  variant?: string
  size?: string
  isBusy?: boolean
  isDisabled?: boolean
  isFullWidth?: boolean
  onClick?: () => void
}): JSX.Element

/** ArvoDropdownButton is items-only, so it cannot be a trigger with a caret. */
export const DropdownTrigger: React.ForwardRefExoticComponent<
  { label: string; icon?: string; isOpen?: boolean } & React.RefAttributes<HTMLButtonElement>
>

/** Works around two ArvoContextMenu bugs in 3.1.2: it never sets `.open`, and
 *  onSelect never fires. */
export function useContextMenuOpen(scope: string): {
  open: (event: MouseEvent) => void
  close: () => void
  isOpen: boolean
}

/* ---- States ------------------------------------------------------------ */

export function ConfirmDialog(props: {
  isOpen: boolean
  title: string
  /** Rendered in the emphasis weight, before the message: the thing being
   *  destroyed. */
  subject?: string
  message: string
  confirmLabel?: string
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element

export function ViewLoading(props: { message?: string }): JSX.Element

export function FilePicker(props: {
  accept?: string
  file?: File | null
  onSelect: (file: File | null) => void
  hint?: string
}): JSX.Element

/* ---- Colour and conditional formatting --------------------------------- */

export type Shade = 'light' | 'soft' | 'bright' | 'base' | 'dark' | 'darker' | 'darkest'
export const ArvoVisualPalette: Record<string, Record<Shade, string>>
export const SERIES: string[]
export const INDICATOR: Record<string, string>
/** Publishes the palette as --arvo-viz-* custom properties. Call once. */
export function publishVizVars(): void

export const NEGATIVE: 'cf-fill--negative'
export const POSITIVE: 'cf-fill--positive'
/** Absolute response-time delta: needs 10% AND 50ms, agreeing in sign. */
export function timeDeltaFill(pct: number | null, val: number | null): string
/** Percentage delta, for response time and sample count: +/-15%. */
export function pctDeltaFill(pct: number | null): string
/** Error-rate delta, in percentage POINTS: +/-0.5. */
export function errorDeltaFill(points: number | null): string
/** An error rate on its own. Tinted text, never a fill: it is a level. */
export function errorLevelClass(pct: number | null): string
/** Infrastructure delta. Text, and no threshold. */
export function infraDeltaClass(delta: number | null): string
