/**
 * @o9qa/kit -- the shared QA Utility building blocks.
 *
 * Every tool in the QA Utility Hub renders from these, so a table behaves the
 * same whichever utility you are in, and a fix reaches all of them at once.
 *
 *   import { DataTable, KpiCell } from '@o9qa/kit'
 *   import '@o9qa/kit/styles'
 *
 * The styles import is not optional -- these components are unstyled without
 * it. It must come after Arvo's own CSS; see the README.
 */

/* Data display */
export { default as DataTable, matchesQuery } from './src/DataTable.jsx'
export { default as MatrixTable } from './src/MatrixTable.jsx'
export { default as KpiCell } from './src/KpiCell.jsx'
export { RowSparkline, RowBar, RowMeter } from './src/RowVisuals.jsx'

/* Charts. Highcharts only -- see the charting rules. */
export { default as Chart } from './src/Chart.jsx'
export { applyChartTheme } from './src/chartTheme.js'

/* Layout */
export { default as ExpandableTile } from './src/ExpandableTile.jsx'

/* Filtering and paging */
export { default as ColumnFilters, matchesRules } from './src/ColumnFilters.jsx'
export { default as PageSizeSelect } from './src/PageSizeSelect.jsx'

/* Controls that work around a gap in @arvo/react 3.1.2 -- see the README. */
export { default as BusyButton } from './src/BusyButton.jsx'
export { default as DropdownTrigger } from './src/DropdownTrigger.jsx'
export { default as useContextMenuOpen } from './src/useContextMenuOpen.js'

/* States */
export { default as ConfirmDialog } from './src/ConfirmDialog.jsx'
export { default as ViewLoading } from './src/ViewLoading.jsx'
export { default as FilePicker } from './src/FilePicker.jsx'

/* Colour and conditional formatting rules. Data visuals take their colour
   from ArvoVisualPalette; interface state uses Arvo's semantic palette. */
export {
  ArvoVisualPalette, SERIES, INDICATOR, publishVizVars,
} from './src/viz.js'
export {
  timeDeltaFill, pctDeltaFill, errorDeltaFill, errorLevelClass, infraDeltaClass,
  NEGATIVE, POSITIVE,
} from './src/conditionalFormat.js'
