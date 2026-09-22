import Highcharts from 'highcharts'
import { SERIES, ArvoVisualPalette } from './viz'

/**
 * Shared Highcharts theme, ported from the Channel Assortments report.
 *
 * Sets APPEARANCE ONLY -- never capability. Animation, tooltips, legend
 * toggling, keyboard navigation and exporting are all left at Highcharts'
 * defaults; a theme that switches features off is a theme that hides bugs.
 *
 * Series colours come from ArvoVisualPalette. Chrome (axes, gridlines, labels,
 * tooltip surface) comes from Arvo's SEMANTIC palette, because a gridline is
 * interface, not data.
 */

/* Highcharts writes several of these straight into SVG attributes, where
 * `var()` does not resolve -- so the chrome values are read out of the
 * cascade once, as literals, rather than passed through as custom properties. */
function readToken(name, fallback) {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function applyChartTheme() {
  const divider = readToken('--arvo-color-b-divider', '#e5e5e5')
  const textSecondary = readToken('--arvo-color-t-secondary', '#303030')
  const surface = readToken('--arvo-color-s-layer-01', '#ffffff')
  const currentTime = readToken('--arvo-color-s-fn-currenttime', '#efbc5c')

  Highcharts.setOptions({
    colors: SERIES,

    chart: {
      /* No `height`: a fixed one wins over the container, so the chart would
         stay that tall however far its tile is expanded. */
      backgroundColor: 'transparent',
      spacing: [8, 8, 8, 8],
      style: { fontFamily: readToken('--o9-font-family', 'o9Sans, NotoSans, Arial, sans-serif') },
      /* Explicit rather than Highcharts' 500ms default, so redraw motion
         matches the rest of the shell. */
      animation: { duration: 300 },
    },

    title: { text: null },
    credits: { enabled: false },

    xAxis: {
      lineColor: divider,
      tickWidth: 0,
      labels: { style: { fontSize: '12px', color: textSecondary } },
    },

    yAxis: {
      title: { text: null },
      gridLineColor: divider,
      labels: { style: { fontSize: '12px', color: textSecondary } },
    },

    legend: {
      align: 'left',
      verticalAlign: 'bottom',
      symbolRadius: 0,
      squareSymbol: true,
      itemStyle: { fontSize: '12px', fontWeight: '400', color: textSecondary },
    },

    tooltip: {
      useHTML: true,
      backgroundColor: surface,
      borderColor: divider,
      borderRadius: 0,
      borderWidth: 1,
      shadow: false,
    },

    plotOptions: {
      /* Arvo is square. Highcharts 12+ defaults `borderRadius` to 3px on every
         column AND bar, so this has to be stated or the shape quietly stops
         matching the design system -- and it is not a value any consumer would
         think to look for.
         `series` is the catch-all: setting it only on `column` left horizontal
         bars rounded, because Highcharts treats `bar` as its own type rather
         than a rotated column. */
      series: { borderRadius: 0 },
      column: {
        borderRadius: 0,
        groupPadding: 0.1,
        /* The separator between stacked segments, drawn in the tile's own
           surface colour so it reads as a gap rather than an outline. 2px
           rather than 1: at 1px two adjacent shades of the same family still
           bled into each other and the stack read as one block. */
        borderWidth: 2,
        borderColor: surface,
      },
      bar: {
        borderRadius: 0,
        groupPadding: 0.1,
        borderWidth: 2,
        borderColor: surface,
      },
    },
  })

  return { divider, textSecondary, surface, currentTime }
}

/**
 * A single measure split into components reads as parts of a whole, so a stack
 * uses one hue in steps rather than unrelated families. Steps are spaced
 * 3 apart -- adjacent shades are too close to separate in a stacked column.
 */
export const stackRamp = (family = 'blue') => [
  ArvoVisualPalette[family].dark,
  ArvoVisualPalette[family].bright,
  ArvoVisualPalette[family].light,
]
