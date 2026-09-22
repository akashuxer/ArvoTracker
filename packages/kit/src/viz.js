/**
 * ArvoVisualPalette -- the canonical Arvo colours for data visualisation.
 *
 * Charts, sparklines, KPI movement, conditional formatting, data bars and
 * heatmaps read from here. Interface state (success / warning / error /
 * disabled / selected / hover / focus) is NOT a data visual -- that uses the
 * Arvo Semantic palette (--arvo-color-{s|b|t|i}-*).
 */
export const ArvoVisualPalette = {
  pink:       { light: '#F2B8D9', soft: '#E38ABF', bright: '#C52E8B', base: '#B60071', dark: '#96005C', darker: '#770049', darkest: '#580036' },
  red:        { light: '#FFBEC5', soft: '#FF96A2', bright: '#FF465C', base: '#FF1E39', dark: '#BC1227', darker: '#931020', darkest: '#660914' },
  orange:     { light: '#FFD7B9', soft: '#FFBE8F', bright: '#FF8C3B', base: '#FF7311', dark: '#D25F0C', darker: '#A44A09', darkest: '#763506' },
  yellow:     { light: '#FFF9B8', soft: '#FFF48A', bright: '#FFEA2E', base: '#FFE500', dark: '#D2BB00', darker: '#A49200', darkest: '#766900' },
  indigo:     { light: '#B3B1F2', soft: '#9B8DEE', bright: '#673CE1', base: '#5111DA', dark: '#410EB4', darker: '#330B8D', darkest: '#250866' },
  purple:     { light: '#D8C7F0', soft: '#BFA2E7', bright: '#8D58D5', base: '#7433CC', dark: '#5F29A8', darker: '#4A2083', darkest: '#35175E' },
  green:      { light: '#CBF9E7', soft: '#AEECD4', bright: '#2FE09D', base: '#00C278', dark: '#00A264', darker: '#00804F', darkest: '#015132' },
  blue:       { light: '#BAD8EB', soft: '#8BC0DD', bright: '#2F8CBB', base: '#0172AA', dark: '#005D8D', darker: '#004A70', darkest: '#003753' },
  blueViolet: { light: '#B8C7FF', soft: '#8AA3FF', bright: '#2E5BFF', base: '#0037FF', dark: '#002ED2', darker: '#0024A4', darkest: '#001A76' },
}

export const FAMILIES = Object.keys(ArvoVisualPalette)
export const SHADES = ['light', 'soft', 'bright', 'base', 'dark', 'darker', 'darkest']

/* Categorical series order: distinct families at readable shades, sequenced for
 * adjacent contrast. yellow.base is omitted -- it fails contrast as a line on a
 * light surface, so yellow.darker stands in. */
export const SERIES = [
  ArvoVisualPalette.blue.base,
  ArvoVisualPalette.orange.base,
  ArvoVisualPalette.green.dark,
  ArvoVisualPalette.purple.base,
  ArvoVisualPalette.pink.base,
  ArvoVisualPalette.blueViolet.dark,
  ArvoVisualPalette.red.dark,
  ArvoVisualPalette.indigo.bright,
  ArvoVisualPalette.blue.bright,
  ArvoVisualPalette.yellow.darker,
]

/* Indicator roles, named by MEANING rather than direction. "Up" is not
 * favourable for latency or error rate, so callers decide from the measure. */
export const INDICATOR = {
  favorable: ArvoVisualPalette.green.darker,
  unfavorable: ArvoVisualPalette.red.dark,
  caution: ArvoVisualPalette.yellow.darkest,
  neutral: ArvoVisualPalette.blue.base,
}

/** Ordered shades within one family, for heatmaps and intensity scales. */
export const sequential = (family) => SHADES.map((s) => ArvoVisualPalette[family][s])

/** Publish the palette to CSS so stylesheets share this one source. */
export function publishVizVars(root = document.documentElement) {
  Object.entries(INDICATOR).forEach(([role, color]) => root.style.setProperty(`--viz-${role}`, color))
  FAMILIES.forEach((fam) => {
    const kebab = fam.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
    SHADES.forEach((sh) => root.style.setProperty(`--arvo-viz-${kebab}-${sh}`, ArvoVisualPalette[fam][sh]))
  })
}
