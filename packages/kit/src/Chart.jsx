import { useEffect, useRef } from 'react'
import Highcharts from 'highcharts'

/**
 * Thin Highcharts wrapper.
 *
 * The chart is created once and updated in place, rather than destroyed and
 * rebuilt on every render -- rebuilding drops the user's legend toggles and
 * zoom, and makes each data refresh flash.
 */
export default function Chart({ options, className = 'chart' }) {
  const el = useRef(null)
  const chart = useRef(null)

  useEffect(() => {
    if (!el.current) return undefined
    chart.current = Highcharts.chart(el.current, options)
    return () => {
      chart.current?.destroy()
      chart.current = null
    }
    // Created once; subsequent option changes go through update() below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // `true, true` -- redraw, and match series one-to-one so removed series
    // actually disappear instead of lingering.
    chart.current?.update(options, true, true)
  }, [options])

  return <div ref={el} className={className} />
}
