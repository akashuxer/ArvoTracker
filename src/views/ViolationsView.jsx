import { useMemo, useState } from 'react'
import { ArvoButton, ArvoSearch, ArvoSelect } from '@arvo/react'
import { DataTable, ExpandableTile, KpiCell, PageSizeSelect, ViewLoading, matchesQuery } from '@o9qa/kit'
import { useTracker } from '../data/store'
import {
  SETTLED_VIOLATION_STATUSES, SEVERITIES, SEVERITY, VIOLATION_CATEGORIES, VIOLATION_STATUSES,
  toItems, toStringItems,
} from '../data/enums'
import { RULE, RULES } from '../data/rules'
import { TEAM, TEAMS } from '../data/mock'
import { Hint, SeverityMark, ViolationStatusBadge, fmtDateTime, timeAgo } from '../components/marks'
import ViolationDetail from '../components/ViolationDetail'

/**
 * Violations -- what the scanner found, and who to talk to.
 *
 * The framing matters more than the table. A violation here is a signal that a
 * team needs support: a repeated one almost always traces back to a missing Arvo
 * token, prop or pattern, which is why every row links to the rule and the rule
 * links to the roadmap item that would remove the whole class of it.
 *
 * The author is recorded, because someone has to be asked. The author is not
 * summarised, ranked or counted anywhere in Analytics -- see that view.
 */

const ANY = '__any'
const withAny = (items, label) => [{ id: ANY, value: ANY, label }, ...items]

const WINDOWS = [
  { id: '7', value: '7', label: 'Last 7 days' },
  { id: '14', value: '14', label: 'Last 14 days' },
  { id: '30', value: '30', label: 'Last 30 days' },
  { id: '90', value: '90', label: 'Last 90 days' },
]

export default function ViolationsView({ onEditItem }) {
  const { status, violations, pushes, latestPush, latestPushViolations, workItems } = useTracker()

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({
    repository: ANY, team: ANY, author: ANY, area: ANY, rule: ANY,
    category: ANY, severity: ANY, vstatus: ANY, window: ANY, push: ANY,
  })
  const [expandedId, setExpandedId] = useState(null)
  const [pageSize, setPageSize] = useState(25)
  const [openRow, setOpenRow] = useState(null)

  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))
  const clearAll = () =>
    setFilters({ repository: ANY, team: ANY, author: ANY, area: ANY, rule: ANY, category: ANY, severity: ANY, vstatus: ANY, window: ANY, push: ANY })
  const activeFilterCount = Object.values(filters).filter((v) => v !== ANY).length

  const repositories = useMemo(() => [...new Set(violations.map((v) => v.repository))].sort(), [violations])
  const authors = useMemo(() => [...new Set(violations.map((v) => v.author))].sort(), [violations])
  const productAreas = useMemo(() => [...new Set(violations.map((v) => v.productArea))].filter(Boolean).sort(), [violations])
  /* Only the pushes that actually produced a finding. Offering the other 300 as
     filter options would bury the ones worth looking at. */
  const pushOptions = useMemo(() => {
    const withFindings = new Set(violations.map((v) => v.pushId))
    return pushes
      .filter((p) => withFindings.has(p.id))
      .slice(-40)
      .reverse()
      .map((p) => ({
        id: p.id,
        value: p.id,
        label: `${p.commitId || p.id} · ${p.repository} · ${p.commitMessage || 'imported'}`,
      }))
  }, [pushes, violations])

  const scoped = useMemo(() => {
    const cutoff =
      filters.window === ANY ? null : Date.now() - Number(filters.window) * 86_400_000
    return violations.filter((v) => {
      if (filters.repository !== ANY && v.repository !== filters.repository) return false
      if (filters.team !== ANY && v.team !== filters.team) return false
      if (filters.author !== ANY && v.author !== filters.author) return false
      if (filters.area !== ANY && v.productArea !== filters.area) return false
      if (filters.rule !== ANY && v.ruleId !== filters.rule) return false
      if (filters.category !== ANY && v.category !== filters.category) return false
      if (filters.severity !== ANY && v.severity !== filters.severity) return false
      if (filters.vstatus !== ANY && v.status !== filters.vstatus) return false
      if (filters.push !== ANY && v.pushId !== filters.push) return false
      if (cutoff && new Date(v.detectedAt).getTime() < cutoff) return false
      return true
    })
  }, [violations, filters])

  const columns = useMemo(
    () => [
      { key: 'id', label: 'ID', className: 'data-table__mono trk-col--meta', sortValue: (v) => Number(v.id.replace(/\D/g, '')) },
      {
        key: 'ruleId',
        label: 'Rule',
        className: 'data-table__mono trk-col--key',
        render: (v) => (
          <button type="button" className="link-cell" onClick={() => setOpenRow(v)}>
            {v.ruleId}
          </button>
        ),
        sortValue: (v) => v.ruleId,
        searchValue: (v) => `${v.ruleId} ${RULE[v.ruleId]?.title ?? ''}`,
      },
      { key: 'category', label: 'Category' },
      {
        key: 'severity',
        label: 'Severity',
        render: (v) => <SeverityMark severity={v.severity} />,
        sortValue: (v) => SEVERITY[v.severity]?.rank ?? 9,
        searchValue: (v) => SEVERITY[v.severity]?.label ?? '',
      },
      { key: 'repository', label: 'Repository', className: 'data-table__mono trk-col--meta trk-col--sep', headerClassName: 'trk-col--sep' },
      { key: 'productArea', label: 'Product area' },
      { key: 'branch', label: 'Branch', className: 'data-table__mono trk-col--meta' },
      { key: 'commitId', label: 'Commit', className: 'data-table__mono trk-col--meta' },
      { key: 'commitMessage', label: 'Commit message', className: 'trk-col-title' },
      { key: 'author', label: 'Author' },
      { key: 'team', label: 'Team', render: (v) => TEAM[v.team]?.name, searchValue: (v) => TEAM[v.team]?.name ?? '' },
      {
        key: 'detectedAt',
        label: 'Detected',
        className: 'data-table__mono trk-col--meta trk-col--sep',
        headerClassName: 'trk-col--sep',
        render: (v) => fmtDateTime(v.detectedAt),
        sortValue: (v) => new Date(v.detectedAt).getTime(),
      },
      {
        key: 'file',
        label: 'File',
        className: 'data-table__mono trk-col--meta',
        render: (v) => `${v.file}:${v.line}`,
        searchValue: (v) => v.file,
      },
      { key: 'occurrences', label: 'Occurrences' },
      {
        key: 'firstDetected',
        label: 'First detected',
        className: 'data-table__mono trk-col--meta',
        render: (v) => timeAgo(v.firstDetected),
        sortValue: (v) => new Date(v.firstDetected).getTime(),
      },
      {
        key: 'isRepeated',
        label: 'Recurrence',
        /* "Repeated" is the single most useful column in this table and the one
           most likely to be read as blame, so it says what it means: the same
           rule tripping in the same file again is a sign the guidance did not
           land, which is the design system's problem to solve. */
        render: (v) => (v.isRepeated ? <span className="trk-repeat">Repeated</span> : 'New'),
        sortValue: (v) => (v.isRepeated ? 0 : 1),
        searchValue: (v) => (v.isRepeated ? 'repeated' : 'new'),
      },
      {
        key: 'status',
        label: 'Status',
        className: 'trk-col--sep',
        headerClassName: 'trk-col--sep',
        render: (v) => <ViolationStatusBadge status={v.status} />,
        sortValue: (v) => VIOLATION_STATUSES.findIndex((s) => s.id === v.status),
        searchValue: (v) => VIOLATION_STATUSES.find((s) => s.id === v.status)?.label ?? '',
      },
      { key: 'assignee', label: 'Assigned owner', className: 'trk-col--meta' },
    ],
    []
  )

  const rows = useMemo(() => {
    const matched = scoped.filter((v) => matchesQuery(v, columns, query))
    /* Newest first, and critical before low within a day. The default order of a
       triage list should be the order you would work it. */
    return matched.sort((a, b) => {
      const byTime = new Date(b.detectedAt) - new Date(a.detectedAt)
      if (byTime !== 0) return byTime
      return (SEVERITY[a.severity]?.rank ?? 9) - (SEVERITY[b.severity]?.rank ?? 9)
    })
  }, [scoped, columns, query])

  const shown = pageSize === -1 ? rows : rows.slice(0, pageSize)

  const summary = useMemo(() => {
    const active = scoped.filter((v) => !SETTLED_VIOLATION_STATUSES.has(v.status))
    const weekAgo = Date.now() - 7 * 86_400_000
    const recent = scoped.filter((v) => new Date(v.detectedAt).getTime() >= weekAgo)
    return {
      latest: latestPushViolations.length,
      fresh: recent.filter((v) => !v.isRepeated).length,
      resolved: scoped.filter((v) => v.status === 'resolved').length,
      critical: active.filter((v) => v.severity === 'critical').length,
      teams: new Set(active.map((v) => v.team)).size,
      repeated: active.filter((v) => v.isRepeated).length,
      active: active.length,
      total: scoped.length,
    }
  }, [scoped, latestPushViolations])

  if (status === 'loading') return <ViewLoading message="Loading scan results…" />

  return (
    <>
      <div className="kpi-row">
        <KpiCell
          label="Latest push"
          value={summary.latest}
          caption={
            latestPush
              ? `${latestPush.repository} · ${latestPush.commitId || 'imported'} · ${timeAgo(latestPush.timestamp)}`
              : 'No pushes yet'
          }
          favourability={summary.latest ? 'caution' : 'favorable'}
        />
        <KpiCell
          label="New this week"
          value={summary.fresh}
          caption="First time this rule tripped in this file"
        />
        <KpiCell
          label="Repeated"
          ratio={{ count: summary.repeated, total: summary.active }}
          caption="Open findings seen here before"
          favourability={summary.repeated ? 'unfavorable' : 'favorable'}
        />
        <KpiCell
          label="Critical open"
          value={summary.critical}
          caption="Accessibility and contrast defects"
          favourability={summary.critical ? 'unfavorable' : 'favorable'}
        />
        <KpiCell
          label="Resolved"
          ratio={{ count: summary.resolved, total: summary.total }}
          caption="Fixed, excepted or withdrawn as a false positive"
          favourability="favorable"
        />
        <KpiCell
          label="Teams with open findings"
          ratio={{ count: summary.teams, total: TEAMS.length }}
          caption="Who to reach out to this week"
        />
      </div>

      <ExpandableTile
        id="violations"
        title="Violations"
        note={`${rows.length} of ${violations.length}`}
        expandedId={expandedId}
        onToggle={setExpandedId}
        canExpand={rows.length > 0}
        actions={
          <>
            <ArvoSearch
              placeholder="Search rule, file, commit, author…"
              value={query}
              onInput={(event) => setQuery(event?.target?.value ?? '')}
              onClear={() => setQuery('')}
            />
            <span className="tile-actions__sep" aria-hidden="true" />
            <Hint text="Repeated means this rule has tripped in this file on an earlier push. It is a prompt to ask what is missing from the guidance, not a mark against the author." />
          </>
        }
      >
        <div className="trk-filters">
          <ArvoSelect label="Repository" items={withAny(toStringItems(repositories), 'Any repository')} value={filters.repository} onChange={({ value }) => set('repository')(value)} />
          <ArvoSelect label="Team" items={withAny(TEAMS.map((t) => ({ id: t.id, value: t.id, label: t.name })), 'Any team')} value={filters.team} onChange={({ value }) => set('team')(value)} />
          <ArvoSelect label="Author" items={withAny(toStringItems(authors), 'Anyone')} value={filters.author} onChange={({ value }) => set('author')(value)} />
          <ArvoSelect label="Product area" items={withAny(toStringItems(productAreas), 'Any area')} value={filters.area} onChange={({ value }) => set('area')(value)} />
          <ArvoSelect label="Rule" items={withAny(RULES.map((r) => ({ id: r.id, value: r.id, label: `${r.id} — ${r.title}` })), 'Any rule')} value={filters.rule} onChange={({ value }) => set('rule')(value)} />
          <ArvoSelect label="Category" items={withAny(toStringItems(VIOLATION_CATEGORIES), 'Any category')} value={filters.category} onChange={({ value }) => set('category')(value)} />
          <ArvoSelect label="Severity" items={withAny(toItems(SEVERITIES), 'Any severity')} value={filters.severity} onChange={({ value }) => set('severity')(value)} />
          <ArvoSelect label="Status" items={withAny(toItems(VIOLATION_STATUSES), 'Any status')} value={filters.vstatus} onChange={({ value }) => set('vstatus')(value)} />
          <ArvoSelect label="Detected" items={withAny(WINDOWS, 'Any time')} value={filters.window} onChange={({ value }) => set('window')(value)} />
          <ArvoSelect label="Push" items={withAny(pushOptions, 'Any push')} value={filters.push} onChange={({ value }) => set('push')(value)} />
          {activeFilterCount > 0 && (
            <ArvoButton
              className="trk-filters__clear"
              variant="inline"
              size="sm"
              label={`Clear ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`}
              onClick={clearAll}
            />
          )}
        </div>

        <DataTable
          columns={columns}
          rows={shown}
          rowKey={(v) => v.id}
          query={query}
          rowActions={{ onShowDetails: setOpenRow }}
          emptyTitle={query || activeFilterCount ? 'No matches' : 'Nothing found'}
          emptyMessage={
            query
              ? `No violations match “${query}”.`
              : activeFilterCount
                ? 'No violations match these filters. That may be the good news it looks like — widen the date range to check.'
                : 'No violations have been recorded. Import a scan result to get started.'
          }
        />
        {rows.length > 10 && (
          <PageSizeSelect value={pageSize} onChange={setPageSize} total={rows.length} shown={shown.length} />
        )}
      </ExpandableTile>

      <ViolationDetail
        violation={openRow}
        isOpen={!!openRow}
        onClose={() => setOpenRow(null)}
        onOpenItem={(w) => {
          setOpenRow(null)
          onEditItem(w)
        }}
        relatedItems={workItems}
      />
    </>
  )
}
