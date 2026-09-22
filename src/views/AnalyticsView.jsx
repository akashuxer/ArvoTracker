import { useMemo, useState } from 'react'
import { ArvoVisualPalette, Chart, DataTable, ExpandableTile, KpiCell, SERIES, ViewLoading } from '@o9qa/kit'
import { useTracker } from '../data/store'
import { CLOSED_STATUSES, SETTLED_VIOLATION_STATUSES, SEVERITIES, STATUSES, TYPES } from '../data/enums'
import { RULE } from '../data/rules'
import { TEAM, TEAMS } from '../data/mock'
import { Hint, MigrationBar } from '../components/marks'

/**
 * Analytics.
 *
 * The rule this view is built around: **the unit of analysis is a team, a
 * repository, a product area or a rule — never a person.** The author is on the
 * violation, so the Arvo team knows who to talk to. Nothing here counts by
 * author, and that is a deliberate refusal rather than an omission: a
 * leaderboard of who tripped the most rules would make people avoid the scanner,
 * and the scanner only works if people want it to run.
 *
 * Colour comes from ArvoVisualPalette -- every chart here is a data visual.
 * Severity uses ORDERED SHADES OF ONE FAMILY because severity is ordered;
 * categories and teams use distinguishable families because they are not.
 */

const WEEK = 7 * 86_400_000

/** Monday-anchored week key, so "this week" means the same thing all week. */
function weekStart(value) {
  const d = new Date(value)
  const day = (d.getUTCDay() + 6) % 7
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)
}

const tally = (rows, key) => {
  const map = new Map()
  rows.forEach((r) => {
    const k = typeof key === 'function' ? key(r) : r[key]
    if (k === undefined || k === null || k === '') return
    map.set(k, (map.get(k) ?? 0) + 1)
  })
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

/* Shared chrome. Every chart in this view is a count of something over one
   dimension, so they should differ only where the data differs. */
const barOptions = (categories, data, color, unitName) => ({
  chart: { type: 'bar', height: Math.max(220, categories.length * 30 + 70) },
  xAxis: {
    categories,
    title: { text: null },
    /* Highcharts caps a category label at a third of the chart width and then
       ellipsises it, which turned "Unsupported typography" and "Non-Arvo
       component used" into "Unsupported…" and "Non-Arvo…" -- indistinguishable
       from each other in a chart whose whole job is telling them apart.
       `whiteSpace: normal` lets the label wrap to a second line instead, and
       the row height above makes room for it. */
    labels: { style: { width: 132, whiteSpace: 'normal', textOverflow: 'none' } },
  },
  yAxis: { title: { text: unitName }, allowDecimals: false },
  legend: { enabled: false },
  plotOptions: { bar: { borderWidth: 0, color } },
  series: [{ name: unitName, data }],
})

export default function AnalyticsView() {
  const { status, violations, areas, workItems } = useTracker()
  const [expandedId, setExpandedId] = useState(null)

  const charts = useMemo(() => {
    if (!violations.length) return null

    /* ---- Weekly series ---- */
    const detectedByWeek = new Map()
    const resolvedByWeek = new Map()
    violations.forEach((v) => {
      const w = weekStart(v.detectedAt)
      detectedByWeek.set(w, (detectedByWeek.get(w) ?? 0) + 1)
      if (v.resolvedAt) {
        const r = weekStart(v.resolvedAt)
        resolvedByWeek.set(r, (resolvedByWeek.get(r) ?? 0) + 1)
      }
    })
    const weeks = [...new Set([...detectedByWeek.keys(), ...resolvedByWeek.keys()])].sort((a, b) => a - b)
    const weekLabels = weeks.map((w) => new Date(w).toISOString().slice(5, 10))

    /* ---- Severity: ordered, so ordered shades of ONE family ---- */
    const severityCounts = SEVERITIES.map((s) => ({
      name: s.label,
      y: violations.filter((v) => v.severity === s.id).length,
    }))
    /* Darkest for Critical down to base for Low: the ramp itself carries the
       order, which a set of unrelated hues cannot.
       It stops at `base` rather than running on to `soft`. red.soft is about
       2.1:1 against the white tile -- below the 3:1 a filled graphical object
       needs, which is ARVO-A11Y-002, the rule this app spends a whole section
       asking other teams to respect. */
    const severityShades = ['darkest', 'darker', 'dark', 'base']

    const byCategory = tally(violations, 'category')
    const byArea = tally(violations, (v) => areas.find((a) => a.id === v.productArea)?.name ?? v.productArea)
    const byTeam = tally(violations, (v) => TEAM[v.team]?.name ?? v.team)
    const byRule = tally(violations, 'ruleId').slice(0, 8)

    /* ---- Modernization: four parts of a whole, per area ---- */
    const areaNames = areas.map((a) => a.name)
    const migrationSeries = [
      { key: 'migrated', name: 'Migrated', color: ArvoVisualPalette.green.dark },
      { key: 'partial', name: 'Partially migrated', color: ArvoVisualPalette.blue.bright },
      { key: 'legacy', name: 'Legacy', color: ArvoVisualPalette.orange.base },
      { key: 'blocked', name: 'Blocked', color: ArvoVisualPalette.red.dark },
    ].map((s) => ({ name: s.name, color: s.color, data: areas.map((a) => a[s.key]) }))

    /* ---- Roadmap: type x status ---- */
    const statusLabels = STATUSES.map((s) => s.label)
    const typeSeries = TYPES.map((t, i) => ({
      name: t.label,
      color: SERIES[i],
      data: STATUSES.map((s) => workItems.filter((w) => w.type === t.id && w.status === s.id).length),
    }))

    return {
      weekly: {
        chart: { type: 'column', height: 280 },
        xAxis: { categories: weekLabels, title: { text: 'Week beginning' } },
        yAxis: { title: { text: 'Violations detected' }, allowDecimals: false },
        legend: { enabled: false },
        plotOptions: { column: { borderWidth: 0, color: ArvoVisualPalette.blue.base } },
        series: [{ name: 'Detected', data: weeks.map((w) => detectedByWeek.get(w) ?? 0) }],
      },
      newVsResolved: {
        chart: { type: 'line', height: 280 },
        xAxis: { categories: weekLabels, title: { text: 'Week beginning' } },
        yAxis: { title: { text: 'Violations' }, allowDecimals: false },
        series: [
          { name: 'Detected', color: ArvoVisualPalette.orange.base, data: weeks.map((w) => detectedByWeek.get(w) ?? 0) },
          { name: 'Resolved', color: ArvoVisualPalette.green.dark, data: weeks.map((w) => resolvedByWeek.get(w) ?? 0) },
        ],
      },
      byCategory: barOptions(byCategory.map((r) => r[0]), byCategory.map((r) => r[1]), ArvoVisualPalette.purple.base, 'Violations'),
      bySeverity: {
        chart: { type: 'column', height: 280 },
        xAxis: { categories: severityCounts.map((r) => r.name), title: { text: null } },
        yAxis: { title: { text: 'Violations' }, allowDecimals: false },
        legend: { enabled: false },
        plotOptions: { column: { borderWidth: 0, colorByPoint: true } },
        colors: severityShades.map((sh) => ArvoVisualPalette.red[sh]),
        series: [{ name: 'Violations', data: severityCounts }],
      },
      byArea: barOptions(byArea.map((r) => r[0]), byArea.map((r) => r[1]), ArvoVisualPalette.blue.base, 'Violations'),
      byTeam: barOptions(byTeam.map((r) => r[0]), byTeam.map((r) => r[1]), ArvoVisualPalette.indigo.bright, 'Violations'),
      byRule: {
        chart: { type: 'bar', height: 280 },
        xAxis: { categories: byRule.map((r) => r[0]), title: { text: null } },
        yAxis: { title: { text: 'Violations' }, allowDecimals: false },
        legend: { enabled: false },
        plotOptions: { bar: { borderWidth: 0, color: ArvoVisualPalette.pink.base } },
        /* The rule title is in the tooltip rather than on the axis: eight full
           titles would need half the tile's width and the ids are what people
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
        xAxis: { categories: areaNames, title: { text: null } },
        yAxis: { title: { text: 'UI areas / components' }, allowDecimals: false, reversedStacks: false },
        plotOptions: { series: { stacking: 'normal', borderWidth: 0 } },
        series: migrationSeries,
      },
      roadmap: {
        chart: { type: 'column', height: 380 },
        xAxis: { categories: statusLabels, title: { text: null }, labels: { rotation: -45 } },
        yAxis: { title: { text: 'Work items' }, allowDecimals: false },
        plotOptions: { column: { stacking: 'normal', borderWidth: 0 } },
        series: typeSeries,
      },
    }
  }, [violations, areas, workItems])

  /**
   * Per-team summary.
   *
   * Team level, not person level. "Resolution rate" is of the findings raised
   * against the team, and "average time to resolve" counts only the settled ones
   * -- an unresolved finding has no duration yet, and treating today as its end
   * would make a team look faster the longer it waited.
   */
  const teamRows = useMemo(
    () =>
      TEAMS.map((t) => {
        const mine = violations.filter((v) => v.team === t.id)
        const active = mine.filter((v) => !SETTLED_VIOLATION_STATUSES.has(v.status))
        const settled = mine.filter((v) => v.resolvedAt)
        const days = settled.map((v) => (new Date(v.resolvedAt) - new Date(v.detectedAt)) / 86_400_000)
        const teamAreas = areas.filter((a) => a.team === t.id)
        const totalComponents = teamAreas.reduce((n, a) => n + a.total, 0)
        const migrated = teamAreas.reduce((n, a) => n + a.migrated, 0)
        return {
          id: t.id,
          name: t.name,
          contact: t.contact,
          active: active.length,
          repeated: active.filter((v) => v.isRepeated).length,
          rate: mine.length ? Math.round((settled.length / mine.length) * 100) : null,
          avgDays: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null,
          migration: totalComponents ? Math.round((migrated / totalComponents) * 100) : null,
          /* Kept so the bar can be drawn from the same parts the Modernization
             view uses, rather than from a percentage that has lost the detail. */
          parts: teamAreas.length
            ? {
                total: totalComponents,
                migrated,
                partial: teamAreas.reduce((n, a) => n + a.partial, 0),
                legacy: teamAreas.reduce((n, a) => n + a.legacy, 0),
                blocked: teamAreas.reduce((n, a) => n + a.blocked, 0),
              }
            : null,
        }
      }),
    [violations, areas]
  )

  const teamColumns = useMemo(
    () => [
      { key: 'name', label: 'Team' },
      { key: 'active', label: 'Active violations' },
      { key: 'repeated', label: 'Repeated' },
      {
        key: 'rate',
        label: 'Resolution rate',
        render: (r) => (r === null ? '' : `${r}%`),
        sortValue: (r) => r.rate ?? -1,
      },
      {
        key: 'avgDays',
        label: 'Avg time to resolve',
        render: (r) => (r.avgDays === null ? '' : `${r.avgDays} days`),
        sortValue: (r) => r.avgDays ?? Infinity,
      },
      {
        key: 'migration',
        label: 'Migration progress',
        className: 'trk-col-bar',
        render: (r) =>
          r.parts ? (
            <span className="trk-progress">
              <MigrationBar area={r.parts} />
              <span className="trk-progress__pct">{r.migration}%</span>
            </span>
          ) : (
            ''
          ),
        sortValue: (r) => r.migration ?? -1,
        searchValue: (r) => (r.migration === null ? '' : `${r.migration}%`),
      },
      { key: 'contact', label: 'Primary contact' },
    ],
    []
  )

  /* Programme health, for the row above the charts. Detected against resolved
     over the same fortnight: a backlog that is growing and one that is shrinking
     look identical in a total. */
  const health = useMemo(() => {
    const since = Date.now() - 2 * WEEK
    const detected = violations.filter((v) => new Date(v.detectedAt).getTime() >= since).length
    const resolved = violations.filter((v) => v.resolvedAt && new Date(v.resolvedAt).getTime() >= since).length
    const active = violations.filter((v) => !SETTLED_VIOLATION_STATUSES.has(v.status))
    const totalComponents = areas.reduce((n, a) => n + a.total, 0)
    const migrated = areas.reduce((n, a) => n + a.migrated, 0)
    return {
      detected,
      resolved,
      active: active.length,
      critical: active.filter((v) => v.severity === 'critical').length,
      openItems: workItems.filter((w) => !CLOSED_STATUSES.has(w.status)).length,
      migrated,
      totalComponents,
    }
  }, [violations, areas, workItems])

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

  return (
    <>
      <div className="kpi-row">
        <KpiCell
          label="Detected vs resolved"
          value={`${health.detected} / ${health.resolved}`}
          caption="Last 14 days. Resolved should lead."
          /* Declared from the measure: more detected than resolved means the
             backlog grew, which is unfavourable however encouraging the raw
             detection count looks. */
          favourability={health.resolved >= health.detected ? 'favorable' : 'unfavorable'}
        />
        <KpiCell label="Active violations" value={health.active} caption="Not yet resolved, excepted or withdrawn" />
        <KpiCell
          label="Critical open"
          value={health.critical}
          caption="Accessibility and contrast"
          favourability={health.critical ? 'unfavorable' : 'favorable'}
        />
        <KpiCell label="Open roadmap items" value={health.openItems} caption="Neither released nor deferred" />
        <KpiCell
          label="Programme migration"
          /* KpiCell composes "count/total" for a `ratio` but not for a `meter`,
             so a meter without `value` renders with no headline at all. The
             denominator is not repeated here -- the meter's end label already
             names the target. */
          value={health.migrated}
          meter={{ value: health.migrated, target: health.totalComponents, targetLabel: `${health.totalComponents} components` }}
          caption="Components fully on Arvo, all areas"
          favourability="favorable"
        />
      </div>

      {/* Three per row on a wide screen, two at 1280 and one at 860 -- the kit's
          own grid, so the charts here breathe the same way the rest of the
          product does. */}
      {/* --solo once a tile has taken the screen: an expanded chart should not
          still be sitting in a third of the row. */}
      <div className={`metric-grid${expandedId ? ' metric-grid--solo' : ''}`}>
        <ExpandableTile
          id="weekly"
          title="Violations by week"
          note="Detected"
          expandedId={expandedId}
          onToggle={setExpandedId}
        >
          <Chart options={charts.weekly} />
        </ExpandableTile>

        <ExpandableTile
          id="new-resolved"
          title="New versus resolved"
          expandedId={expandedId}
          onToggle={setExpandedId}
          actions={<Hint text="Resolved counts the week a finding was settled, not the week it was raised. The two lines crossing the other way means the backlog is growing." />}
        >
          <Chart options={charts.newVsResolved} />
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
          id="team"
          title="Violations by team"
          expandedId={expandedId}
          onToggle={setExpandedId}
          actions={<Hint text="Raw counts, not normalised. A team with a 62-component area will trip more rules than one with 12, so read this next to Migration progress rather than on its own." />}
        >
          <Chart options={charts.byTeam} />
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
        id="teams"
        title="Team summary"
        note="Teams, repositories and rules — never individuals"
        expandedId={expandedId}
        onToggle={setExpandedId}
        actions={
          <Hint text="Average time to resolve counts settled findings only. Counting the open ones as if they ended today would make a team look faster the longer it left them." />
        }
      >
        <DataTable
          columns={teamColumns}
          rows={teamRows}
          rowKey={(r) => r.id}
          emptyMessage="No teams have findings against them."
        />
      </ExpandableTile>
    </>
  )
}
