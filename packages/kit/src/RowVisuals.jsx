import { useEffect, useMemo, useRef, useState } from 'react'
import Chart from './Chart'
import { ArvoVisualPalette, INDICATOR } from './viz'

/**
 * Small visuals that live inside a table row.
 *
 * The bar and meter are plain markup: they encode one number, and a chart
 * engine per row buys nothing for that. The sparkline IS a Highcharts chart,
 * because it encodes a series and Highcharts is this project's only charting
 * library -- but it is stripped to a shape: no axes, no tooltip, no mouse
 * tracking, no animation. It shows movement, not values; the value has its own
 * column beside it.
 */

/** A share of the largest value in the column, so rows are comparable. */
export function RowBar({ value, max, tone = 'neutral', label }) {
  if (value === null || value === undefined || !max) return null
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const color = tone === 'neutral' ? ArvoVisualPalette.blue.base : INDICATOR[tone]

  return (
    <span className="row-bar" title={label}>
      <span className="row-bar__track">
        <span className="row-bar__fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </span>
    </span>
  )
}

/** Progress toward a known total: "2 / 3". States the denominator. */
export function RowMeter({ value, total }) {
  if (!total) return null
  const pct = Math.max(0, Math.min(100, (value / total) * 100))
  const isDone = value >= total

  return (
    <span className="row-meter">
      <span className="row-bar__track">
        <span
          className="row-bar__fill"
          style={{
            width: `${pct}%`,
            backgroundColor: isDone ? INDICATOR.favorable : ArvoVisualPalette.blue.base,
          }}
        />
      </span>
      <span className="row-meter__text">
        {value} / {total}
      </span>
    </span>
  )
}

/**
 * Mount the chart only once its row is on screen.
 *
 * Measured: 46 Highcharts instances took 4.07 SECONDS to mount, and React
 * blocked on all of them -- the whole table appeared four seconds late for the
 * sake of a column of 90x22 glyphs. Roughly a dozen rows are visible at a time,
 * so this pays for those and defers the rest until they are scrolled to.
 * `rootMargin` starts the ones just past the fold early, so scrolling does not
 * reveal a row of blanks.
 */
function useIsNearViewport() {
  const ref = useRef(null)
  const [isNear, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || isNear) return undefined
    /* No IntersectionObserver (old browser, jsdom) means show everything
       rather than nothing -- degrading to the previous behaviour, not to a
       blank column. */
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setNear(true),
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isNear])

  return [ref, isNear]
}

/** The shape of a series over the run. */
export function RowSparkline({ data, tone = 'neutral' }) {
  const [ref, isNear] = useIsNearViewport()
  const options = useMemo(() => {
    if (!data?.length) return null
    const color = tone === 'neutral' ? ArvoVisualPalette.blue.base : INDICATOR[tone]
    return {
      chart: {
        type: 'area',
        height: 22,
        width: 90,
        margin: [2, 0, 2, 0],
        backgroundColor: 'transparent',
        /* 46 of these mount at once; animating every one on first paint is
           the difference between the table appearing and the table arriving. */
        animation: false,
      },
      title: { text: null },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: { visible: false },
      yAxis: { visible: false },
      tooltip: { enabled: false },
      plotOptions: {
        area: {
          color,
          fillOpacity: 0.12,
          lineWidth: 1.25,
          marker: { enabled: false },
          enableMouseTracking: false,
          animation: false,
          states: { hover: { enabled: false } },
        },
      },
      series: [{ data }],
    }
  }, [data, tone])

  if (!options) return null
  /* The placeholder holds the row's height either way, so nothing reflows when
     the chart arrives. */
  return (
    <span className="row-spark" ref={ref}>
      {isNear && <Chart options={options} className="row-spark__chart" />}
    </span>
  )
}
