import { useMemo, useState } from 'react'
import { ArvoButton, ArvoSearch, ArvoSelect } from '@arvo/react'
import { DataTable, ExpandableTile, KpiCell, ViewLoading, matchesQuery } from '@o9qa/kit'
import { useTracker } from '../data/store'
import { MIGRATION_STATES, toItems, toStringItems } from '../data/enums'
import { RELEASES, TEAM, TEAMS } from '../data/mock'
import { Hint, MigrationBar, fmtDate, timeAgo } from '../components/marks'
import AreaDetail from '../components/AreaDetail'

/**
 * Modernization -- how far each product area has moved onto Arvo.
 *
 * Deliberately not a leaderboard. Pivot/Grid is last and has the best reason for
 * it: eight of its components are blocked on a pattern Arvo has not shipped. The
 * column that explains a number sits next to the number, so the table cannot be
 * read as a ranking of effort.
 */

const ANY = '__any'
const withAny = (items, label) => [{ id: ANY, value: ANY, label }, ...items]

/** What an area's overall state is, from its parts. Derived, never stored. */
function stateOf(area) {
  if (area.blocked > 0) return 'blocked'
  if (area.migrated === area.total) return 'migrated'
  if (area.migrated === 0) return 'legacy'
  return 'partial'
}

const pct = (area) => (area.total ? Math.round((area.migrated / area.total) * 100) : 0)

export default function ModernizationView({ onEditItem }) {
  const { status, areas, workItems } = useTracker()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ team: ANY, owner: ANY, state: ANY, version: ANY, release: ANY })
  const [expandedId, setExpandedId] = useState(null)
  const [openArea, setOpenArea] = useState(null)

  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))
  const activeFilterCount = Object.values(filters).filter((v) => v !== ANY).length

  const owners = useMemo(() => [...new Set(areas.map((a) => a.owner))].sort(), [areas])
  const versions = useMemo(() => [...new Set(areas.map((a) => a.arvoVersion))].sort(), [areas])

  const scoped = useMemo(
    () =>
      areas.filter((a) => {
        if (filters.team !== ANY && a.team !== filters.team) return false
        if (filters.owner !== ANY && a.owner !== filters.owner) return false
        if (filters.state !== ANY && stateOf(a) !== filters.state) return false
        if (filters.version !== ANY && a.arvoVersion !== filters.version) return false
        /* "Target release" here means the release the area is aiming at, which is
           carried by the roadmap items it depends on -- an area has a target
           DATE of its own, but releases are what teams plan against. */
        if (filters.release !== ANY) {
          const deps = workItems.filter((w) => a.dependencies.includes(w.id))
          if (!deps.some((w) => w.targetRelease === filters.release)) return false
        }
        return true
      }),
    [areas, filters, workItems]
  )

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Product area',
        className: 'trk-col--key',
        render: (a) => (
          <button type="button" className="link-cell" onClick={() => setOpenArea(a)}>
            {a.name}
          </button>
        ),
        sortValue: (a) => a.name,
        searchValue: (a) => `${a.name} ${a.notes}`,
      },
      { key: 'team', label: 'Team', className: 'trk-col--meta', render: (a) => TEAM[a.team]?.name, searchValue: (a) => TEAM[a.team]?.name ?? '' },
      { key: 'owner', label: 'Owner', className: 'trk-col--meta' },
      { key: 'total', label: 'UI areas', className: 'trk-col--sep', headerClassName: 'trk-col--sep' },
      { key: 'migrated', label: 'Migrated' },
      { key: 'partial', label: 'Partial' },
      { key: 'legacy', label: 'Legacy' },
      { key: 'blocked', label: 'Blocked' },
      {
        key: 'progress',
        label: 'Migration',
        className: 'trk-col-bar',
        /* The bar and the figure together. A bar alone cannot be read to a
           precision anyone can act on, and a percentage alone hides that the
           remainder is eight BLOCKED components rather than eight unstarted
           ones -- which is the whole difference between "behind" and "stuck". */
        render: (a) => (
          <span className="trk-progress">
            <MigrationBar area={a} />
            <span className="trk-progress__pct">{pct(a)}%</span>
          </span>
        ),
        sortValue: (a) => pct(a),
        searchValue: (a) => `${pct(a)}%`,
      },
      {
        key: 'target',
        label: 'Target completion',
        className: 'trk-col--meta trk-col--sep',
        headerClassName: 'trk-col--sep',
        render: (a) => fmtDate(a.target),
        sortValue: (a) => (a.target ? new Date(a.target).getTime() : Infinity),
      },
      { key: 'arvoVersion', label: 'Arvo version', className: 'data-table__mono trk-col--meta' },
      {
        key: 'lastActivity',
        label: 'Last activity',
        className: 'trk-col--meta',
        render: (a) => timeAgo(a.lastActivity),
        sortValue: (a) => new Date(a.lastActivity).getTime(),
      },
      {
        key: 'dependencies',
        label: 'Waiting on',
        className: 'trk-col--sep',
        headerClassName: 'trk-col--sep',
        isSortable: false,
        render: (a) =>
          a.dependencies.length ? (
            <span className="trk-deps">
              {a.dependencies.map((id) => {
                const w = workItems.find((x) => x.id === id)
                return (
                  <button
                    key={id}
                    type="button"
                    className="trk-chip-link"
                    title={w ? w.title : id}
                    onClick={() => (w ? onEditItem(w) : undefined)}
                  >
                    {id}
                  </button>
                )
              })}
            </span>
          ) : (
            ''
          ),
        searchValue: (a) => a.dependencies.join(' '),
      },
    ],
    [workItems, onEditItem]
  )

  const rows = useMemo(() => scoped.filter((a) => matchesQuery(a, columns, query)), [scoped, columns, query])

  /* Programme-level totals, summed from components rather than averaged from
     percentages: a 12-component area and a 62-component one do not count the
     same, and averaging their percentages says they do. */
  const totals = useMemo(() => {
    const sum = (key) => scoped.reduce((n, a) => n + a[key], 0)
    const total = sum('total')
    return {
      total,
      migrated: sum('migrated'),
      blocked: sum('blocked'),
      legacy: sum('legacy'),
      complete: scoped.filter((a) => a.migrated === a.total && a.total > 0).length,
      areas: scoped.length,
      behindVersion: scoped.filter((a) => a.arvoVersion !== '3.1.2').length,
    }
  }, [scoped])

  if (status === 'loading') return <ViewLoading message="Loading migration state…" />

  return (
    <>
      <div className="kpi-row">
        <KpiCell
          label="Components on Arvo"
          /* KpiCell composes "count/total" for a `ratio` but not for a `meter`,
             so a meter without `value` renders with no headline at all. The
             caption does not restate the count or the denominator -- the meter's
             end label already names the target. */
          value={totals.migrated}
          meter={{ value: totals.migrated, target: totals.total, targetLabel: `${totals.total} components` }}
          caption={`Fully migrated, across ${totals.areas} product areas`}
          favourability="favorable"
        />
        <KpiCell
          label="Areas complete"
          ratio={{ count: totals.complete, total: totals.areas }}
          caption="Every component migrated"
        />
        <KpiCell
          label="Blocked components"
          value={totals.blocked}
          caption="Waiting on Arvo, not on the team"
          favourability={totals.blocked ? 'caution' : undefined}
        />
        <KpiCell
          label="Still on legacy"
          value={totals.legacy}
          caption="Not started, and not blocked"
          favourability={totals.legacy > 40 ? 'unfavorable' : undefined}
        />
        <KpiCell
          label="Behind on Arvo"
          ratio={{ count: totals.behindVersion, total: totals.areas }}
          caption="Areas not on the current minor"
          favourability={totals.behindVersion ? 'caution' : undefined}
        />
      </div>

      <ExpandableTile
        id="areas"
        title="Product areas"
        note={`${rows.length} of ${areas.length}`}
        expandedId={expandedId}
        onToggle={setExpandedId}
        canExpand={rows.length > 0}
        actions={
          <>
            <ArvoSearch
              placeholder="Search areas, owners, notes…"
              value={query}
              onInput={(event) => setQuery(event?.target?.value ?? '')}
              onClear={() => setQuery('')}
            />
            <span className="tile-actions__sep" aria-hidden="true" />
            <Hint text="Migration percentage counts fully migrated components only. Partially migrated ones are shown as their own band on the bar, because half a component is not half a migration." />
          </>
        }
      >
        <div className="trk-filters">
          <ArvoSelect label="Team" items={withAny(TEAMS.map((t) => ({ id: t.id, value: t.id, label: t.name })), 'Any team')} value={filters.team} onChange={({ value }) => set('team')(value)} />
          <ArvoSelect label="Owner" items={withAny(toStringItems(owners), 'Anyone')} value={filters.owner} onChange={({ value }) => set('owner')(value)} />
          <ArvoSelect label="Migration status" items={withAny(toItems(MIGRATION_STATES), 'Any status')} value={filters.state} onChange={({ value }) => set('state')(value)} />
          <ArvoSelect label="Arvo version" items={withAny(toStringItems(versions), 'Any version')} value={filters.version} onChange={({ value }) => set('version')(value)} />
          <ArvoSelect label="Blocked on release" items={withAny(toStringItems(RELEASES), 'Any release')} value={filters.release} onChange={({ value }) => set('release')(value)} />
          {activeFilterCount > 0 && (
            <ArvoButton
              className="trk-filters__clear"
              variant="inline"
              size="sm"
              label={`Clear ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`}
              onClick={() => setFilters({ team: ANY, owner: ANY, state: ANY, version: ANY, release: ANY })}
            />
          )}
        </div>

        {/* The legend belongs with the bars, not in a tooltip: four bands that
            can only be told apart by colour would fail the same rule the scanner
            enforces on everyone else. */}
        <ul className="trk-legend">
          {MIGRATION_STATES.map((s) => (
            <li className="trk-legend__row" key={s.id}>
              <span className={`trk-legend__swatch trk-mig__seg--${s.id}`} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          query={query}
          rowActions={{ onShowDetails: setOpenArea }}
          emptyTitle={query || activeFilterCount ? 'No matches' : 'Nothing tracked yet'}
          emptyMessage={
            query
              ? `No product areas match “${query}”.`
              : activeFilterCount
                ? 'No product areas match these filters.'
                : 'No product areas are being tracked.'
          }
        />
      </ExpandableTile>

      <AreaDetail
        area={openArea}
        isOpen={!!openArea}
        onClose={() => setOpenArea(null)}
        onOpenItem={(w) => {
          setOpenArea(null)
          onEditItem(w)
        }}
      />
    </>
  )
}
