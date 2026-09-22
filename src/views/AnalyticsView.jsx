import { useMemo, useState } from 'react'
import { ArvoChip } from '@arvo/react'
import { ArvoVisualPalette, Chart, DataTable, ExpandableTile, KpiCell, SERIES, ViewLoading } from '@o9qa/kit'
import { useTracker } from '../data/store'
import { CLOSED_STATUSES, SETTLED_VIOLATION_STATUSES, SEVERITIES, STATUSES, TYPES } from '../data/enums'
import { RULE } from '../data/rules'
import { DEVELOPER, TEAM, TODAY, adoptionOf } from '../data/mock'
import { AdoptionBar, Hint } from '../components/marks'
import { DAY, GRAIN, GRAINS, bucketBy, bucketCount, formatMovement, labelFor, movement, periods, toDate } from '../lib/series'
import DeveloperDetail from '../components/DeveloperDetail'

/**
 * Analytics -- how everything is moving.
 *
 * Every headline figure here is a comparison, not a total. "68 open findings"
 * is a number nobody can act on; "68, down 14 on last month" is. That is what
 * the sparkline behind each KPI is for -- one delta can be noise, and twelve
 * months of shape says whether it is.
 *
 * The M / Q / Y switch changes the GRAIN of every time chart at once. They are
 * the same questions at three zoom levels, and letting them drift apart would
 * put a twelve-month story beside a three-year one with nothing saying which
 * was which.
 *
 * On naming people: this view used to refuse to, on the grounds that a count of
 * rules broken is a stick. It names them now, at the product owner's direction,
 * and the design absorbs that rather than fighting it -- the developer chart
 * counts OPEN findings rather than total-ever (which only measures who has been
 * here longest), the summary table sorts by adoption descending so it opens on
 * who is furthest along, and every row carries a trend beside its number so
 * somebody climbing is never mistaken for somebody stuck.
 *
 * Colour comes from ArvoVisualPalette -- every chart here is a data visual.
 * Severity uses ORDERED SHADES OF ONE FAMILY because severity is ordered;
 * categories, areas and people use distinguishable families because they are
 * not.
 */
const tally = (rows, key) => {
  const map = new Map()
  rows.forEach((r) => {
    const k = typeof key === 'function' ? key(r) : r[key]
    if (k === undefined || k === null || k === '') return
    map.set(k, (map.get(k) ?? 0) + 1)
  })
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

const barOptions = (categories, data, color, unitName) => ({
  chart: { type: 'bar', height: Math.max(220, categories.length * 30 + 70) },
  xAxis: {
    categories,
    title: { text: null },
    /* Highcharts caps a category label at a third of the chart width and then
       ellipsises it, which turned "Unsupported typography" and "Non-Arvo
       component used" into "Unsupported…" and "Non-Arvo…" -- indistinguishable
       in a chart whose whole job is telling them apart. `whiteSpace: normal`
       wraps to a second line instead. */
    labels: { style: { width: 132, whiteSpace: 'normal', textOverflow: 'none' } },
  },
  yAxis: { title: { text: unitName }, allowDecimals: false },
  legend: { enabled: false },
  plotOptions: { bar: { borderWidth: 0, color } },
  series: [{ name: unitName, data }],
})

export default function AnalyticsView() {
  const { status, violations, areas, areaHistory, workItems, pullRequests, developers } = useTracker()
  const [expandedId, setExpandedId] = useState(null)
  const [grain, setGrain] = useState('month')
  const [openDev, setOpenDev] = useState(null)

  const g = GRAIN[grain]

  /* ---- Series ----------------------------------------------------------- */

  const series = useMemo(() => {
    if (!violations.length) return null

    const detected = bucketCount(violations, grain, (v) => v.detectedAt)
    const resolved = bucketCount(violations, grain, (v) => v.resolvedAt)

    /* Adoption per period is a RATIO, not a count. A quiet month with two very
       Arvo pull requests is a good month, not a small one, and bucketing by
       count would show it as the opposite. */
    const merged = pullRequests.filter((p) => p.status === 'merged')
    const withUi = merged.map((p) => ({ p, a: adoptionOf(p) })).filter((r) => r.a)
    const adoption = bucketBy(withUi, grain, (r) => r.p.mergedAt, (rows) => {
      const a = rows.reduce((n, r) => n + r.a.arvo, 0)
      const l = rows.reduce((n, r) => n + r.a.legacy, 0)
      return a + l ? Math.round((a / (a + l)) * 100) : null
    })

    /* Migration is monthly by nature -- AREA_HISTORY holds thirteen snapshots
       and nothing finer exists -- so this one series stays monthly whichever
       grain is selected, and its tile says so rather than pretending. */
    const migrationKeys = periods('month', 13)
    const migration = migrationKeys.map((_, i) =>
      areas.reduce((n, a) => n + (areaHistory[a.id]?.[i] ?? 0), 0)
    )

    return {
      detected,
      resolved,
      adoption,
      migration: { labels: migrationKeys.map((k) => labelFor(k, 'month')), values: migration },
      totalComponents: areas.reduce((n, a) => n + a.total, 0),
    }
  }, [violations, pullRequests, areas, areaHistory, grain])

  /* ---- Headline movement ------------------------------------------------ */

  const kpis = useMemo(() => {
    if (!series) return null
    const active = violations.filter((v) => !SETTLED_VIOLATION_STATUSES.has(v.status))

    /* Open findings at the END of each period -- a running balance, not a
       per-period count. It is the only series here that answers "is the backlog
       growing", which is the question a design-system lead actually has.
       Detected and resolved each tell half of it.
       Each bucket's end is the NEXT bucket's start, so the boundary is exact at
       every grain rather than a rounded 31 or 7 days. */
    const openAt = (t) =>
      violations.filter(
        (v) =>
          new Date(v.detectedAt).getTime() < t &&
          (!v.resolvedAt || new Date(v.resolvedAt).getTime() >= t)
      ).length

    const keys = periods(grain)
    const backlog = keys.map((k, i) => openAt(keys[i + 1] ?? TODAY.getTime() + DAY))

    /* The same point one period back, for the headline comparison. */
    const then = new Date(TODAY)
    if (grain === 'year') then.setUTCFullYear(then.getUTCFullYear() - 1)
    else if (grain === 'quarter') then.setUTCMonth(then.getUTCMonth() - 3)
    else then.setUTCMonth(then.getUTCMonth() - 1)

    /* Flows use `toDate`, snapshots use `movement`.
       Comparing a 22-day month against a complete one reported every flow as
       down 40-50% when nothing had happened except the month not being over. */
    return {
      detected: toDate(violations, grain, (v) => v.detectedAt, { higherIsBetter: false }),
      resolved: toDate(violations, grain, (v) => v.resolvedAt, { higherIsBetter: true }),
      detectedSeries: series.detected.values,
      resolvedSeries: series.resolved.values,
      /* A balance is already a point in time, so it is compared point to point:
         open NOW against open on the same day one period back.
         Reading it off the bucket series instead compared "now" with "the end of
         last month" -- a real number, but not the one the label "vs same point
         last month" claims, and three weeks apart rather than a month. */
      backlog: movement(
        { values: [openAt(then.getTime()), openAt(TODAY.getTime() + DAY)] },
        { higherIsBetter: false }
      ),
      backlogSeries: backlog,
      adoption: toDate(
        pullRequests.filter((p) => p.status === 'merged').map((p) => ({ p, a: adoptionOf(p) })).filter((r) => r.a),
        grain,
        (r) => r.p.mergedAt,
        {
          higherIsBetter: true,
          /* A ratio, so the slice is reduced rather than counted. */
          reduce: (rows) => {
            const a = rows.reduce((n, r) => n + r.a.arvo, 0)
            const l = rows.reduce((n, r) => n + r.a.legacy, 0)
            return a + l ? Math.round((a / (a + l)) * 100) : 0
          },
        }
      ),
      migration: movement({ values: series.migration.values }, { higherIsBetter: true }),
      activeNow: active.length,
      critical: active.filter((v) => v.severity === 'critical').length,
      openItems: workItems.filter((w) => !CLOSED_STATUSES.has(w.status)).length,
      totalComponents: series.totalComponents,
    }
  }, [series, violations, pullRequests, workItems, grain])

  /* ---- Charts ----------------------------------------------------------- */

  const charts = useMemo(() => {
    if (!series || !kpis) return null

    const severityCounts = SEVERITIES.map((s) => ({
      name: s.label,
      y: violations.filter((v) => v.severity === s.id).length,
    }))
    /* Darkest for Critical down to base for Low: the ramp carries the order. It
       stops at `base` rather than running on to `soft`, which is about 2.1:1
       against the white tile -- below the 3:1 a filled graphical object needs,
       and that is ARVO-A11Y-002, one of this app's own rules. */
    const severityShades = ['darkest', 'darker', 'dark', 'base']

    const byCategory = tally(violations, 'category')
    const byArea = tally(violations, (v) => areas.find((a) => a.id === v.productArea)?.name ?? v.productArea)
    const byRule = tally(violations, 'ruleId').slice(0, 8)

    /* OPEN findings per developer, not total ever raised. Total-ever ranks
       whoever has been on the team longest, which is the opposite of a useful
       signal. Open is what is still costing something. */
    const openViolations = violations.filter((v) => !SETTLED_VIOLATION_STATUSES.has(v.status))
    const byDeveloper = tally(openViolations, 'author')

    const migrationSeries = [
      { key: 'migrated', name: 'Migrated', color: ArvoVisualPalette.green.dark },
      { key: 'partial', name: 'Partially migrated', color: ArvoVisualPalette.blue.bright },
      { key: 'legacy', name: 'Legacy', color: ArvoVisualPalette.orange.base },
      { key: 'blocked', name: 'Blocked', color: ArvoVisualPalette.red.dark },
    ].map((s) => ({ name: s.name, color: s.color, data: areas.map((a) => a[s.key]) }))

    const typeSeries = TYPES.map((t, i) => ({
      name: t.label,
      color: SERIES[i],
      data: STATUSES.map((s) => workItems.filter((w) => w.type === t.id && w.status === s.id).length),
    }))

    const axisTitle = g.axis

    return {
      backlog: {
        chart: { type: 'area', height: 300 },
        xAxis: { categories: series.detected.labels, title: { text: axisTitle } },
        yAxis: { title: { text: 'Open at period end' }, allowDecimals: false },
        legend: { enabled: false },
        plotOptions: { area: { color: ArvoVisualPalette.blue.base, fillOpacity: 0.18, lineWidth: 2 } },
        series: [{ name: 'Open', data: kpis.backlogSeries }],
      },
      newVsResolved: {
        chart: { type: 'line', height: 300 },
        xAxis: { categories: series.detected.labels, title: { text: axisTitle } },
        yAxis: { title: { text: 'Violations' }, allowDecimals: false },
        series: [
          { name: 'Detected', color: ArvoVisualPalette.orange.base, data: series.detected.values },
          { name: 'Resolved', color: ArvoVisualPalette.green.dark, data: series.resolved.values },
        ],
      },
      adoption: {
        chart: { type: 'line', height: 300 },
        xAxis: { categories: series.adoption.labels, title: { text: axisTitle } },
        yAxis: { title: { text: 'Arvo share of UI uses' }, min: 0, max: 100, labels: { format: '{value}%' } },
        legend: { enabled: false },
        series: [
          {
            name: 'Adoption',
            color: ArvoVisualPalette.green.dark,
            /* connectNulls, so a period nobody merged in is a gap bridged by the
               line rather than a plunge to zero. */
            connectNulls: true,
            data: series.adoption.values,
          },
        ],
      },
      migrationTrend: {
        chart: { type: 'area', height: 300 },
        xAxis: { categories: series.migration.labels, title: { text: 'Month' } },
        yAxis: {
          title: { text: 'Components on Arvo' },
          allowDecimals: false,
          max: series.totalComponents,
          /* The ceiling, named. A rising line with no target above it looks
             like progress whatever its slope. */
          plotLines: [
            {
              value: series.totalComponents,
              color: ArvoVisualPalette.blue.soft,
              dashStyle: 'Dash',
              width: 1,
              label: { text: `${series.totalComponents} to migrate`, style: { fontSize: '10px' } },
            },
          ],
        },
        legend: { enabled: false },
        plotOptions: { area: { color: ArvoVisualPalette.green.dark, fillOpacity: 0.18, lineWidth: 2 } },
        series: [{ name: 'Migrated', data: series.migration.values }],
      },
      bySeverity: {
        chart: { type: 'column', height: 280 },
        xAxis: { categories: severityCounts.map((r) => r.name), title: { text: null } },
        yAxis: { title: { text: 'Violations' }, allowDecimals: false },
        legend: { enabled: false },
        plotOptions: { column: { borderWidth: 0, colorByPoint: true } },
        colors: severityShades.map((sh) => ArvoVisualPalette.red[sh]),
        series: [{ name: 'Violations', data: severityCounts }],
      },
      byCategory: barOptions(byCategory.map((r) => r[0]), byCategory.map((r) => r[1]), ArvoVisualPalette.purple.base, 'Violations'),
      byArea: barOptions(byArea.map((r) => r[0]), byArea.map((r) => r[1]), ArvoVisualPalette.blue.base, 'Violations'),
      byDeveloper: barOptions(byDeveloper.map((r) => r[0]), byDeveloper.map((r) => r[1]), ArvoVisualPalette.indigo.bright, 'Open findings'),
      byRule: {
        chart: { type: 'bar', height: 300 },
        xAxis: { categories: byRule.map((r) => r[0]), title: { text: null } },
        yAxis: { title: { text: 'Violations' }, allowDecimals: false },
        legend: { enabled: false },
        plotOptions: { bar: { borderWidth: 0, color: ArvoVisualPalette.pink.base } },
        /* The rule title goes in the tooltip rather than on the axis: eight full
           titles would need half the tile's width, and the ids are what people
           quote to each other. */
        tooltip: {
          formatter() {
            return `<b>${this.category}</b><br/>${RULE[this.category]?.title ?? ''}<br/>${this.y} violations`
          },
        },
        series: [{ name: 'Violations', data: byRule.map((r) => r[1]) }],
      },
      migration: {
        chart: { type: 'bar', height: 380 },
        xAxis: { categories: areas.map((a) => a.name), title: { text: null } },
        yAxis: { title: { text: 'UI areas / components' }, allowDecimals: false, reversedStacks: false },
        plotOptions: { series: { stacking: 'normal' } },
        series: migrationSeries,
      },
      roadmap: {
        chart: { type: 'column', height: 380 },
        xAxis: { categories: STATUSES.map((s) => s.label), title: { text: null }, labels: { rotation: -45 } },
        yAxis: { title: { text: 'Work items' }, allowDecimals: false },
        plotOptions: { column: { stacking: 'normal' } },
        series: typeSeries,
      },
    }
  }, [series, kpis, violations, areas, workItems, g])

  /**
   * Per-developer summary.
   *
   * What keeps this from being a leaderboard is the trend column and the sort.
   * Two people at 34% are not in the same situation if one is climbing and the
   * other is flat, and the default order is adoption DESCENDING -- so the table
   * opens on who is furthest along rather than on who is furthest behind.
   */
  const devRows = useMemo(
    () =>
      developers.map((d) => {
        const merged = pullRequests.filter((p) => p.author === d.name && p.status === 'merged')
        const withUi = merged.map((p) => ({ p, a: adoptionOf(p) })).filter((r) => r.a)
        const arvo = withUi.reduce((n, r) => n + r.a.arvo, 0)
        const legacy = withUi.reduce((n, r) => n + r.a.legacy, 0)

        const s = bucketBy(withUi, 'month', (r) => r.p.mergedAt, (rows) => {
          if (!rows.length) return null
          const a = rows.reduce((n, r) => n + r.a.arvo, 0)
          const l = rows.reduce((n, r) => n + r.a.legacy, 0)
          return a + l ? Math.round((a / (a + l)) * 100) : null
        })
        /* A month with no merged PR carries the previous value forward. Drawing
           it as 0% would show a holiday as a collapse. */
        let carried = null
        const filled = s.values.map((v) => (v === null ? carried : (carried = v)))

        const mine = violations.filter((v) => v.author === d.name)
        const open = mine.filter((v) => !SETTLED_VIOLATION_STATUSES.has(v.status))
        const settled = mine.filter((v) => v.resolvedAt)
        const days = settled.map((v) => (new Date(v.resolvedAt) - new Date(v.detectedAt)) / 86_400_000)

        const distinct = new Set()
        merged.forEach((p) => Object.keys(p.arvoUsed).forEach((k) => distinct.add(k)))

        return {
          id: d.id,
          name: d.name,
          team: TEAM[d.team]?.name ?? d.team,
          prs: merged.length,
          arvo,
          legacy,
          pct: arvo + legacy ? Math.round((arvo / (arvo + legacy)) * 100) : null,
          move: movement({ values: filled.filter((v) => v !== null) }, { higherIsBetter: true }),
          distinct: distinct.size,
          open: open.length,
          repeated: open.filter((v) => v.isRepeated).length,
          rate: mine.length ? Math.round((settled.length / mine.length) * 100) : null,
          avgDays: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null,
        }
      }),
    [developers, pullRequests, violations]
  )

  const devColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Developer',
        className: 'trk-col--key',
        render: (r) => (
          <button type="button" className="link-cell" onClick={() => setOpenDev(DEVELOPER[r.name])}>
            {r.name}
          </button>
        ),
        sortValue: (r) => r.name,
      },
      { key: 'team', label: 'Team', className: 'trk-col--meta' },
      { key: 'prs', label: 'Merged PRs', className: 'trk-col--sep', headerClassName: 'trk-col--sep' },
      {
        key: 'pct',
        label: 'Arvo adoption',
        className: 'trk-col-bar',
        render: (r) =>
          r.pct === null ? (
            ''
          ) : (
            <span className="trk-progress">
              <AdoptionBar arvo={r.arvo} legacy={r.legacy} />
              <span className="trk-progress__pct">{r.pct}%</span>
            </span>
          ),
        sortValue: (r) => r.pct ?? -1,
        searchValue: (r) => (r.pct === null ? '' : `${r.pct}%`),
      },
      {
        key: 'move',
        label: 'Trend',
        render: (r) => (
          <span className={`trk-move trk-move--${r.move.favourability ?? 'flat'}`}>
            {r.move.change === 0 ? 'flat' : formatMovement(r.move, 'pp')}
          </span>
        ),
        sortValue: (r) => r.move.change,
        searchValue: (r) => (r.move.change === 0 ? 'flat' : formatMovement(r.move, 'pp')),
      },
      { key: 'distinct', label: 'Components used' },
      { key: 'open', label: 'Open findings', className: 'trk-col--sep', headerClassName: 'trk-col--sep' },
      { key: 'repeated', label: 'Repeated' },
      {
        key: 'rate',
        label: 'Resolution rate',
        render: (r) => (r.rate === null ? '' : `${r.rate}%`),
        sortValue: (r) => r.rate ?? -1,
      },
      {
        key: 'avgDays',
        label: 'Avg time to resolve',
        render: (r) => (r.avgDays === null ? '' : `${r.avgDays} days`),
        sortValue: (r) => r.avgDays ?? Infinity,
      },
    ],
    []
  )

  if (status === 'loading') return <ViewLoading message="Summarising…" />

  if (!charts) {
    return (
      <ExpandableTile id="empty" title="Analytics" expandedId={null} onToggle={() => {}} canExpand={false}>
        <p className="trk-prose trk-prose--quiet">
          Nothing to summarise yet. Import a scan result on the Violations section and this fills in.
        </p>
      </ExpandableTile>
    )
  }

  const per = g.vs

  return (
    <>
      <div className="kpi-row">
        <KpiCell
          label="Open findings"
          value={kpis.activeNow}
          delta={formatMovement(kpis.backlog)}
          deltaLabel={per}
          /* The balance, not the inflow. Down is favourable -- declared, because
             no direction can be read off the sign alone. */
          favourability={kpis.backlog.favourability}
          spark={kpis.backlogSeries}
          caption="The backlog at the end of each period"
        />
        <KpiCell
          label="Detected"
          value={kpis.detected.current}
          delta={formatMovement(kpis.detected)}
          deltaLabel={per}
          favourability={kpis.detected.favourability}
          spark={series.detected.values}
          caption="Raised this period"
        />
        <KpiCell
          label="Resolved"
          value={kpis.resolved.current}
          delta={formatMovement(kpis.resolved)}
          deltaLabel={per}
          /* Up is favourable here, and only the caller knows that. */
          favourability={kpis.resolved.favourability}
          spark={series.resolved.values}
          caption="Fixed, excepted or withdrawn"
        />
        <KpiCell
          label="Arvo adoption"
          value={`${kpis.adoption.current}%`}
          delta={formatMovement(kpis.adoption, 'pp')}
          deltaLabel={per}
          favourability={kpis.adoption.favourability}
          spark={series.adoption.values.map((v) => v ?? 0)}
          caption="Share of UI uses in merged PRs"
        />
        <KpiCell
          label="Components on Arvo"
          value={kpis.migration.current}
          delta={formatMovement(kpis.migration)}
          deltaLabel="vs last month"
          favourability={kpis.migration.favourability}
          spark={series.migration.values}
          caption={`of ${kpis.totalComponents}, all product areas`}
        />
        <KpiCell
          label="Critical open"
          value={kpis.critical}
          caption="Accessibility and contrast"
          favourability={kpis.critical ? 'unfavorable' : 'favorable'}
        />
      </div>

      {/* One switch, every time chart. They are the same questions at two zoom
          levels; letting them drift would put a four-month story beside a
          twelve-month one with nothing saying which was which. */}
      <div className="trk-grain">
        <span className="trk-grain__label">Period</span>
        {GRAINS.map((row) => (
          <ArvoChip
            key={row.id}
            variant="filter"
            /* The letter carries it, and the word is there so the letter never
               has to be guessed at. "M" alone would be a puzzle the first time
               anybody met this row. */
            label={`${row.short} · ${row.label}`}
            isSelected={grain === row.id}
            onSelectedChange={() => setGrain(row.id)}
          />
        ))}
        <Hint text="Changes the grain of every time-series chart and of the movement figure on each KPI above. Movement compares this period SO FAR against the same slice of the one before it — 22 days against 22 days — so a month that is not over yet does not read as a collapse. Migration is a monthly snapshot by nature and stays monthly at any grain." />
      </div>

      <div className={`metric-grid${expandedId ? ' metric-grid--solo' : ''}`}>
        <ExpandableTile
          id="backlog"
          title="Open findings over time"
          note={g.label}
          expandedId={expandedId}
          onToggle={setExpandedId}
          actions={<Hint text="The running balance, not the inflow. Detected and resolved each tell half the story; only this line says whether the backlog is growing." />}
        >
          <Chart options={charts.backlog} />
        </ExpandableTile>

        <ExpandableTile
          id="new-resolved"
          title="Detected versus resolved"
          expandedId={expandedId}
          onToggle={setExpandedId}
          actions={<Hint text="Resolved counts the period a finding was settled, not the period it was raised. Detected running above resolved means the backlog is growing." />}
        >
          <Chart options={charts.newVsResolved} />
        </ExpandableTile>

        <ExpandableTile
          id="adoption"
          title="Arvo adoption over time"
          note="Merged PRs"
          expandedId={expandedId}
          onToggle={setExpandedId}
          actions={<Hint text="The share of UI component uses that were Arvo rather than legacy, weighted by uses. A period with nothing merged is bridged rather than drawn as a drop to zero." />}
        >
          <Chart options={charts.adoption} />
        </ExpandableTile>

        <ExpandableTile
          id="migration-trend"
          title="Migration over the last year"
          note="Monthly"
          expandedId={expandedId}
          onToggle={setExpandedId}
          actions={<Hint text="Components fully migrated, summed across all product areas. Monthly whichever grain is selected — no finer snapshot exists. The dashed line is the total still to migrate." />}
        >
          <Chart options={charts.migrationTrend} />
        </ExpandableTile>

        <ExpandableTile id="severity" title="Violations by severity" expandedId={expandedId} onToggle={setExpandedId}>
          <Chart options={charts.bySeverity} />
        </ExpandableTile>

        <ExpandableTile id="category" title="Violations by category" expandedId={expandedId} onToggle={setExpandedId}>
          <Chart options={charts.byCategory} />
        </ExpandableTile>

        <ExpandableTile id="area" title="Violations by product area" expandedId={expandedId} onToggle={setExpandedId}>
          <Chart options={charts.byArea} />
        </ExpandableTile>

        <ExpandableTile
          id="developer"
          title="Open findings by developer"
          expandedId={expandedId}
          onToggle={setExpandedId}
          actions={<Hint text="OPEN findings, not total ever raised — total-ever only measures who has been on the team longest. Read it beside Arvo adoption in the table below: a high count with a rising adoption trend is somebody learning fast, not somebody struggling." />}
        >
          <Chart options={charts.byDeveloper} />
        </ExpandableTile>

        <ExpandableTile
          id="rules"
          title="Most frequently violated rules"
          note="Top 8"
          expandedId={expandedId}
          onToggle={setExpandedId}
          actions={<Hint text="The most useful chart here. A rule at the top across several teams is usually a gap in Arvo rather than a habit in the product code." />}
        >
          <Chart options={charts.byRule} />
        </ExpandableTile>

        <ExpandableTile
          id="migration"
          title="Modernization progress by area"
          expandedId={expandedId}
          onToggle={setExpandedId}
          className="metric-grid__wide"
        >
          <Chart options={charts.migration} />
        </ExpandableTile>

        <ExpandableTile
          id="roadmap-mix"
          title="Roadmap items by type and status"
          expandedId={expandedId}
          onToggle={setExpandedId}
          className="metric-grid__wide"
        >
          <Chart options={charts.roadmap} />
        </ExpandableTile>
      </div>

      <ExpandableTile
        id="developers"
        title="Developer summary"
        note="Adoption first, highest at the top"
        expandedId={expandedId}
        onToggle={setExpandedId}
        actions={
          <Hint text="Read adoption and trend together — somebody at 34% and rising needs something different from somebody at 34% and flat, and the percentage alone cannot tell them apart. Average time to resolve counts settled findings only; counting the open ones as if they ended today would make a person look faster the longer they left them." />
        }
      >
        <DataTable
          columns={devColumns}
          rows={[...devRows].sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))}
          rowKey={(r) => r.id}
          emptyMessage="No developers in the directory."
        />
      </ExpandableTile>

      <DeveloperDetail developer={openDev} isOpen={!!openDev} onClose={() => setOpenDev(null)} />
    </>
  )
}
