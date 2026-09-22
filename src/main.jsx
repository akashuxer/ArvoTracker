import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* Design-system CSS stack. The order is load-bearing and mirrors the packages'
   own bootstrap: tokens define every --arvo-* custom property, assets register
   o9con, o9illus and the o9Sans faces, and component styles consume both.
   o9illus is a SEPARATE entry point from the icons -- without it ArvoEmptyState
   renders a blank space where the illustration should be, silently. */
import '@arvo/tokens/css'
import '@arvo/assets/o9con/css'
import '@arvo/assets/o9illus/css'
import '@arvo/assets/fonts/css'
import '@arvo/styles/css'

/* Arvo's STATIC tokens -- spacing, radius, icon size, motion -- are SCSS-only
   in @arvo/tokens and therefore absent from arvo.css, so they arrive as this
   generated CSS bundle instead.

   Vendored rather than built here: generating it needs the SCSS sources from
   the Arvo monorepo, not just the published package. Regenerate after an Arvo
   version bump and never hand-edit it -- see README, "Updating Arvo". */
import '../vendor/o9/o9-foundation.css'

/* The shared kit's stylesheet, after Arvo's so it can build on the tokens. It
   carries the shell layout (rail, header, canvas, tiles) as well as the
   components, which is what lets every app built on the kit look like one
   product without restating any of it. */
import '@o9qa/kit/styles'

/* Highcharts' accessibility module: keyboard navigation through data points, a
   screen-reader description of each series, and the data table behind every
   chart. Not on by default -- Highcharts warns about its absence and then
   renders an unusable chart anyway.
   This app spends a whole section asking other teams to respect ARVO-A11Y-003
   (keyboard support). Shipping eleven charts nobody can tab through would make
   that hard to say with a straight face. */
/* Highcharts itself first. The module attaches to the Highcharts singleton at
   import time, and on its own it loaded before that singleton existed and threw
   reading `.AST` of undefined -- taking the whole app down rather than just
   failing to add accessibility. */
import 'highcharts'
import 'highcharts/modules/accessibility'

import { publishVizVars, applyChartTheme } from '@o9qa/kit'
import './styles/tracker.css'
import App from './App'

/* Migration bars, severity marks and the analytics charts are data marks, so
   the palette rules put them on ArvoVisualPalette rather than Arvo's semantic
   t-positive / t-negative. They are applied in CSS and the palette is
   JavaScript, so the roles are bridged here rather than restating the hexes. */
publishVizVars()

/* Chart chrome is read out of the cascade as literals, because Highcharts
   writes several of these values into SVG attributes where var() does not
   resolve. So the theme is applied AFTER the stylesheets above. */
applyChartTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
