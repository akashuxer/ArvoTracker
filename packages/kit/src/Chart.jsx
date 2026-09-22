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

  /**
   * Follow the container.
   *
   * Highcharts draws at the pixel height it was given in `options` and then
   * ignores its container forever. So an expanded tile grew to fill the screen
   * while the chart inside stayed 300px, leaving a band of empty tile beneath
   * it -- the tile was full, the chart was not.
   *
   * The container's height is the authority instead: it carries the options
   * height as an inline style while collapsed (below), and the expanded
   * stylesheet overrides that to fill the tile. Either way this reports the
   * real size back to Highcharts.
   *
   * The equality guard is what stops it looping. While collapsed the container
   * is exactly the height the chart already is, so nothing fires; only a change
   * the chart did not cause gets acted on.
   */
  useEffect(() => {
    const node = el.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => {
      const instance = chart.current
      if (!instance) return
      const { clientWidth: w, clientHeight: h } = node
      /* A hidden or unmounted container measures 0. Resizing to that throws
         away the chart's layout and it comes back blank when shown again. */
      if (!w || !h) return
      if (Math.abs((instance.chartWidth ?? 0) - w) > 2 || Math.abs((instance.chartHeight ?? 0) - h) > 2) {
        instance.setSize(w, h, false)
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  /* The options height, mirrored onto the container, so the element the
     observer measures and the height Highcharts drew at start out agreeing.
     Without it the container is `auto` -- it takes its height FROM the chart --
     and collapsing an expanded tile left it stuck at the expanded height,
     because nothing ever told it to shrink back. */
  const height = options?.chart?.height
  return (
    <div
      ref={el}
      className={className}
      style={typeof height === 'number' ? { height: `${height}px` } : undefined}
    />
  )
}
