import { useMemo } from 'react'
import Chart from './Chart'
import { ArvoVisualPalette, INDICATOR } from './viz'

/**
 * KPI cell.
 *
 * Four optional visuals, in order of how much they claim:
 *
 *   spark    -- a series: shows shape over time
 *   ratio    -- part of a whole: n of total, with the denominator stated
 *   meter    -- progress toward a target, with the target stated
 *   (none)   -- a bare measure, which is most of them
 *
 * `ratio` and `meter` are deliberately separate. A bar that means "25 of 38
 * failed" and a bar that means "92% of target" look identical but say opposite
 * things, and a single `fill` prop invited exactly that confusion.
 *
 * `favourability` is stated by the caller, never inferred from a delta's sign:
 * for latency and error rate a rise is unfavourable.
 */
export default function KpiCell({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  favourability,
  caption,
  /** number[] -- renders a sparkline of the measure over time. */
  spark,
  /** { count, total } -- part of a whole. The denominator is always shown. */
  ratio,
  /** { value, target, targetLabel } -- progress toward a stated target. */
  meter,
}) {
  const tone = favourability ? `--${favourability}` : ''
  const markColor = favourability ? INDICATOR[favourability] : ArvoVisualPalette.blue.base

  const sparkOptions = useMemo(() => {
    if (!spark?.length) return null
    return {
      chart: { type: 'area', height: 40, margin: [2, 0, 2, 0], backgroundColor: 'transparent' },
      title: { text: null },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: { visible: false },
      yAxis: { visible: false },
      /* A sparkline is a shape, not a readout -- no axes, no tooltip chrome,
         and no interaction to invite reading exact values off it. */
      tooltip: { enabled: false },
      plotOptions: {
        area: {
          color: markColor,
          fillOpacity: 0.15,
          lineWidth: 1.5,
          marker: { enabled: false },
          enableMouseTracking: false,
        },
      },
      series: [{ data: spark }],
    }
  }, [spark, markColor])

  /* A part of a whole reads as one figure, not two. `2` on the headline with
     `2 of 9` restated under the bar said the same thing twice and made the
     denominator -- the part that gives the number meaning -- the quieter of
     the two. The caller can still pass its own value; this only fills in the
     obvious one. */
  const shown =
    ratio && (value === undefined || value === null || value === ratio.count)
      ? `${ratio.count}/${ratio.total}`
      : value

  const pct = ratio
    ? ratio.total
      ? Math.round((ratio.count / ratio.total) * 100)
      : 0
    : meter
      ? Math.min(100, Math.round((meter.value / (meter.target || 1)) * 100))
      : null

  return (
    <div className="kpi-cell">
      <span className="kpi-cell__label">{label}</span>

      <span className="kpi-cell__value">
        {shown}
        {unit && <span className="kpi-cell__unit"> {unit}</span>}
      </span>

      {(delta || deltaLabel) && (
        <span className="kpi-cell__meta">
          {delta && (
            <span className={`kpi-cell__delta${tone ? ` kpi-cell__delta${tone}` : ''}`}>
              {delta}
            </span>
          )}
          {deltaLabel && <span className="kpi-cell__foot">{deltaLabel}</span>}
        </span>
      )}

      {sparkOptions && (
        <div className="kpi-cell__spark">
          <Chart options={sparkOptions} className="kpi-spark" />
        </div>
      )}

      {ratio && (
        /* Part of a whole. The denominator sits on the bar, so it can never be
           mistaken for progress toward a goal.

           The legend is the caption when there is one: repeating "2 of 9"
           beside a value that already reads "2/9" says the same thing twice
           and pushes the card taller for nothing. */
        <div className="kpi-cell__visual">
          <span className="kpi-cell__scale">
            {/* The headline already carries the denominator unless the caller
                overrode it with something else entirely. */}
            <span>{caption ?? (String(shown).includes('/') ? '' : `${ratio.count} of ${ratio.total}`)}</span>
            <strong>{pct}%</strong>
          </span>
          <div className="kpi-cell__track" role="img" aria-label={`${ratio.count} of ${ratio.total}`}>
            <div
              className={`kpi-cell__fill${tone ? ` kpi-cell__fill${tone}` : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {meter && (
        /* Progress toward a target. The target is named at both ends of the
           bar, so the bar is not a bare proportion the reader has to guess the
           meaning of. */
        <div className="kpi-cell__visual">
          <span className="kpi-cell__scale">
            <span>{caption ?? `${pct}% of ${meter.targetLabel ?? `target (${meter.target})`}`}</span>
            <strong>{pct}%</strong>
          </span>
          <div className="kpi-cell__track" role="img" aria-label={`${pct}% of ${meter.targetLabel ?? 'target'}`}>
            <div
              className={`kpi-cell__fill${tone ? ` kpi-cell__fill${tone}` : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="kpi-cell__ends">
            <span>0</span>
            <span>Target {meter.targetLabel ?? '100%'}</span>
          </span>
        </div>
      )}

      {caption && !ratio && !meter && <span className="kpi-cell__foot">{caption}</span>}
    </div>
  )
}
