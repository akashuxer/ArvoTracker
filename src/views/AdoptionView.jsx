import { useMemo, useState } from 'react'
import { ArvoButton, ArvoSearch, ArvoSelect } from '@arvo/react'
import { DataTable, ExpandableTile, KpiCell, PageSizeSelect, ViewLoading, matchesQuery } from '@o9qa/kit'
import { useTracker } from '../data/store'
import { COMPONENTS, COMPONENT_GROUPS, PUBLIC_COMPONENTS } from '../data/catalog'
import { DEVELOPER, TEAM, TEAMS, adoptionOf } from '../data/mock'
import { SETTLED_VIOLATION_STATUSES, toStringItems } from '../data/enums'
import { AdoptionBar, Hint, fmtDate, timeAgo } from '../components/marks'
import { bucketBy, formatMovement, movement, toDate } from '../lib/series'
import DeveloperDetail from '../components/DeveloperDetail'

/**
 * Adoption -- what people ARE using.
 *
 * The Violations section is the shadow of this one: it says what went wrong.
 * This says what went right, and it is the more useful of the two for a design
 * system team, because it is the number you are actually trying to move.
 *
 * Three tabs over the same pull requests:
 *
 *   Pull requests  which change adopted what, and who opened it
 *   Developers     who is climbing, who is flat, who has not started
 *   Components     what the system is actually being used FOR
 *
 * A note on the developer tab. It names individuals, which the Violations
 * section deliberately does not aggregate. The distinction is the measure: a
 * count of rules broken is a stick, and an adoption trend is a diagnosis. The
 * columns here are built to answer "who would benefit from an hour of help",
 * which is why the trend sits next to the number -- somebody at 30% and rising
 * needs something different from somebody at 30% and flat, and a single ranked
 * list shows them as the same person.
 */

const ANY = '__any'
const withAny = (items, label) => [{ id: ANY, value: ANY, label }, ...items]

export default function AdoptionView({ subTab = 'prs' }) {
  const { status, pullRequests, violations, developers } = useTracker()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ team: ANY, developer: ANY, repository: ANY, group: ANY })
  const [expandedId, setExpandedId] = useState(null)
  const [pageSize, setPageSize] = useState(25)
  const [openDev, setOpenDev] = useState(null)

  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))
  const clearAll = () => setFilters({ team: ANY, developer: ANY, repository: ANY, group: ANY })
  const activeFilterCount = Object.values(filters).filter((v) => v !== ANY).length

  const repositories = useMemo(
    () => [...new Set(pullRequests.map((p) => p.repository))].sort(),
    [pullRequests]
  )

  /* Violations per PR, counted once. Every tab wants it and recomputing it
     inside three different tables is three chances to count it differently. */
  const violationsByPr = useMemo(() => {
    const map = new Map()
    violations.forEach((v) => {
      if (!v.prId) return
      const row = map.get(v.prId) ?? { total: 0, open: 0 }
      row.total += 1
      if (!SETTLED_VIOLATION_STATUSES.has(v.status)) row.open += 1
      map.set(v.prId, row)
    })
    return map
  }, [violations])

  const scopedPrs = useMemo(
    () =>
      pullRequests.filter((p) => {
        if (filters.team !== ANY && p.team !== filters.team) return false
        if (filters.developer !== ANY && p.author !== filters.developer) return false
        if (filters.repository !== ANY && p.repository !== filters.repository) return false
        return true
      }),
    [pullRequests, filters]
  )

  /* ---- Rows per tab ----------------------------------------------------- */

  const prRows = useMemo(
    () =>
      scopedPrs.map((p) => {
        const a = adoptionOf(p)
        const v = violationsByPr.get(p.id) ?? { total: 0, open: 0 }
        return {
          ...p,
          adoption: a,
          arvoCount: a?.arvo ?? 0,
          legacyCount: a?.legacy ?? 0,
          violationCount: v.total,
          openViolations: v.open,
          componentList: Object.keys(p.arvoUsed).join(' '),
        }
      }),
    [scopedPrs, violationsByPr]
  )

  const devRows = useMemo(() => {
    const scoped = developers.filter(
      (d) =>
        (filters.team === ANY || d.team === filters.team) &&
        (filters.developer === ANY || d.name === filters.developer)
    )
    return scoped.map((d) => {
      const mine = pullRequests.filter((p) => p.author === d.name && p.status === 'merged')
      const withUi = mine.map((p) => ({ p, a: adoptionOf(p) })).filter((r) => r.a)
      const arvo = withUi.reduce((n, r) => n + r.a.arvo, 0)
      const legacy = withUi.reduce((n, r) => n + r.a.legacy, 0)
      const pct = arvo + legacy ? Math.round((arvo / (arvo + legacy)) * 100) : null

      /* Their adoption month by month. Reduced to a ratio per bucket rather
         than a count, because a quiet month with two very Arvo PRs should read
         as a good month, not a small one. A month they did not ship carries
         the previous value forward -- a gap drawn as 0% would look like a
         collapse rather than a holiday. */
      const series = bucketBy(withUi, 'month', (r) => r.p.mergedAt, (rows) => {
        if (!rows.length) return null
        const a = rows.reduce((n, r) => n + r.a.arvo, 0)
        const l = rows.reduce((n, r) => n + r.a.legacy, 0)
        return a + l ? Math.round((a / (a + l)) * 100) : null
      })
      let carried = null
      const filled = series.values.map((v) => (v === null ? carried : (carried = v)))

      const mineViolations = violations.filter((x) => x.author === d.name)
      const open = mineViolations.filter((x) => !SETTLED_VIOLATION_STATUSES.has(x.status))

      /* What they reach for most -- the fastest way to see whether someone has
         found the system or is using two of its thirty components. */
      const uses = {}
      mine.forEach((p) => Object.entries(p.arvoUsed).forEach(([k, n]) => { uses[k] = (uses[k] ?? 0) + n }))
      const top = Object.entries(uses).sort((a, b) => b[1] - a[1])

      const move = movement({ values: filled.filter((v) => v !== null) }, { higherIsBetter: true })

      return {
        ...d,
        prs: mine.length,
        arvo,
        legacy,
        pct,
        spark: filled.map((v) => v ?? 0),
        move,
        distinct: top.length,
        top: top.slice(0, 3).map(([k]) => k),
        violations: mineViolations.length,
        openViolations: open.length,
        repeated: open.filter((x) => x.isRepeated).length,
        internalUses: mine.filter((p) => p.usedInternal).length,
      }
    })
  }, [developers, pullRequests, violations, filters])

  const componentRows = useMemo(() => {
    const merged = scopedPrs.filter((p) => p.status === 'merged')
    const stats = new Map()
    merged.forEach((p) => {
      Object.entries(p.arvoUsed).forEach(([name, n]) => {
        const row = stats.get(name) ?? { uses: 0, prs: 0, devs: new Set(), teams: new Set(), first: null }
        row.uses += n
        row.prs += 1
        row.devs.add(p.author)
        row.teams.add(p.team)
        const at = p.mergedAt || p.openedAt
        if (!row.first || new Date(at) < new Date(row.first)) row.first = at
        stats.set(name, row)
      })
    })
    /* Every catalogued component, not only the used ones. A component with
       zero uses is the most actionable row on this screen -- it is either
       undiscovered, undocumented, or was never needed -- and a table built
       from the usage data alone can never show it. */
    return COMPONENTS.filter((c) => filters.group === ANY || c.group === filters.group).map((c) => {
      const s = stats.get(c.name)
      return {
        name: c.name,
        group: c.group,
        since: c.since,
        isDeprecated: !!c.isDeprecated,
        isInternal: !!c.isInternal,
        note: c.isInternal ? `Internal — use ${c.useInstead}` : c.isDeprecated ? `Deprecated — use ${c.replacedBy}` : '',
        uses: s?.uses ?? 0,
        prs: s?.prs ?? 0,
        developers: s ? s.devs.size : 0,
        teams: s ? s.teams.size : 0,
        firstUsed: s?.first ?? '',
      }
    })
  }, [scopedPrs, filters.group])

  /* ---- KPI row, month over month ---------------------------------------- */

  const kpis = useMemo(() => {
    const merged = pullRequests.filter((p) => p.status === 'merged')
    const withUi = merged.map((p) => ({ p, a: adoptionOf(p) })).filter((r) => r.a)

    const adoption = bucketBy(withUi, 'month', (r) => r.p.mergedAt, (rows) => {
      const a = rows.reduce((n, r) => n + r.a.arvo, 0)
      const l = rows.reduce((n, r) => n + r.a.legacy, 0)
      return a + l ? Math.round((a / (a + l)) * 100) : 0
    })
    const prCount = bucketBy(merged, 'month', (p) => p.mergedAt, (rows) => rows.length)
    const arvoUses = bucketBy(withUi, 'month', (r) => r.p.mergedAt, (rows) =>
      rows.reduce((n, r) => n + r.a.arvo, 0)
    )
    const legacyUses = bucketBy(withUi, 'month', (r) => r.p.mergedAt, (rows) =>
      rows.reduce((n, r) => n + r.a.legacy, 0)
    )
    const activeDevs = bucketBy(merged, 'month', (p) => p.mergedAt, (rows) =>
      new Set(rows.map((p) => p.author)).size
    )

    return {
      adoption,
      prCount,
      arvoUses,
      legacyUses,
      activeDevs,
      /* Every one of these is a FLOW -- it accumulates within the month -- so
         the comparison is month-to-date against the same slice of last month.
         `movement` would put 22 days beside 30 and report the lot as down 40-50%
         when nothing had happened except the month not being over.

         Favourability is declared per measure, never inferred from the sign:
         legacy uses falling is good, every other measure here rising is. */
      mAdoption: toDate(withUi, 'month', (r) => r.p.mergedAt, {
        higherIsBetter: true,
        reduce: (rows) => {
          const a = rows.reduce((n, r) => n + r.a.arvo, 0)
          const l = rows.reduce((n, r) => n + r.a.legacy, 0)
          return a + l ? Math.round((a / (a + l)) * 100) : 0
        },
      }),
      mPrs: toDate(merged, 'month', (p) => p.mergedAt, { higherIsBetter: true }),
      mArvo: toDate(withUi, 'month', (r) => r.p.mergedAt, {
        higherIsBetter: true,
        reduce: (rows) => rows.reduce((n, r) => n + r.a.arvo, 0),
      }),
      mLegacy: toDate(withUi, 'month', (r) => r.p.mergedAt, {
        higherIsBetter: false,
        reduce: (rows) => rows.reduce((n, r) => n + r.a.legacy, 0),
      }),
      mDevs: toDate(merged, 'month', (p) => p.mergedAt, {
        higherIsBetter: true,
        reduce: (rows) => new Set(rows.map((p) => p.author)).size,
      }),
      unusedCount: PUBLIC_COMPONENTS.filter(
        (c) => !merged.some((p) => p.arvoUsed[c.name])
      ).length,
    }
  }, [pullRequests])

  if (status === 'loading') return <ViewLoading message="Measuring adoption…" />

  const prColumns = [
    { key: 'id', label: 'PR', className: 'data-table__mono', sortValue: (p) => p.number },
    { key: 'title', label: 'Title', className: 'trk-col-title' },
    { key: 'repository', label: 'Repository', className: 'data-table__mono' },
    { key: 'productArea', label: 'Area' },
    { key: 'team', label: 'Team', render: (p) => TEAM[p.team]?.name, searchValue: (p) => TEAM[p.team]?.name ?? '' },
    {
      key: 'author',
      label: 'Developer',
      render: (p) => (
        <button type="button" className="link-cell" onClick={() => setOpenDev(DEVELOPER[p.author])}>
          {p.author}
        </button>
      ),
      sortValue: (p) => p.author,
    },
    {
      key: 'adoption',
      label: 'Arvo adoption',
      className: 'trk-col-bar',
      /* The bar and the figure together, and a PR that touched no UI says so
         rather than scoring 0% -- a config change is not a failure to adopt. */
      render: (p) =>
        p.adoption ? (
          <span className="trk-progress">
            <AdoptionBar arvo={p.adoption.arvo} legacy={p.adoption.legacy} />
            <span className="trk-progress__pct">{p.adoption.pct}%</span>
          </span>
        ) : (
          <span className="trk-muted">no UI</span>
        ),
      sortValue: (p) => p.adoption?.pct ?? -1,
      searchValue: (p) => (p.adoption ? `${p.adoption.pct}%` : 'no ui'),
    },
    { key: 'arvoCount', label: 'Arvo uses' },
    { key: 'legacyCount', label: 'Legacy uses' },
    {
      key: 'componentList',
      label: 'Components used',
      isSortable: false,
      render: (p) => {
        const names = Object.keys(p.arvoUsed)
        if (!names.length) return ''
        return (
          <span className="trk-pills trk-pills--inline">
            {names.slice(0, 4).map((n) => (
              <span className="trk-pill" key={n}>
                {n.replace('Arvo', '')}
              </span>
            ))}
            {names.length > 4 && <span className="trk-muted">+{names.length - 4}</span>}
          </span>
        )
      },
    },
    {
      key: 'openViolations',
      label: 'Open findings',
      render: (p) => (p.violationCount ? `${p.openViolations} of ${p.violationCount}` : '0'),
      sortValue: (p) => p.openViolations,
    },
    {
      key: 'status',
      label: 'State',
      render: (p) => (p.status === 'merged' ? `merged ${timeAgo(p.mergedAt)}` : p.status),
      sortValue: (p) => p.status,
    },
  ]

  const devColumns = [
    {
      key: 'name',
      label: 'Developer',
      render: (d) => (
        <button type="button" className="link-cell" onClick={() => setOpenDev(d)}>
          {d.name}
        </button>
      ),
      sortValue: (d) => d.name,
    },
    { key: 'team', label: 'Team', render: (d) => TEAM[d.team]?.name, searchValue: (d) => TEAM[d.team]?.name ?? '' },
    { key: 'prs', label: 'Merged PRs' },
    {
      key: 'pct',
      label: 'Arvo adoption',
      className: 'trk-col-bar',
      render: (d) =>
        d.pct === null ? (
          ''
        ) : (
          <span className="trk-progress">
            <AdoptionBar arvo={d.arvo} legacy={d.legacy} />
            <span className="trk-progress__pct">{d.pct}%</span>
          </span>
        ),
      sortValue: (d) => d.pct ?? -1,
      searchValue: (d) => (d.pct === null ? '' : `${d.pct}%`),
    },
    {
      key: 'trend',
      label: 'Trend',
      isSortable: false,
      /* The column that stops this being a ranking. Two people at 30% are not
         in the same situation if one is climbing and the other is not, and the
         percentage alone cannot tell them apart. */
      render: (d) => (
        <span className={`trk-move trk-move--${d.move.favourability ?? 'flat'}`}>
          {d.move.change === 0 ? 'flat' : formatMovement(d.move, 'pp')}
        </span>
      ),
    },
    {
      key: 'distinct',
      label: 'Components used',
      render: (d) => `${d.distinct} of ${PUBLIC_COMPONENTS.length}`,
      sortValue: (d) => d.distinct,
    },
    { key: 'top', label: 'Reaches for', isSortable: false, render: (d) => d.top.map((n) => n.replace('Arvo', '')).join(', ') },
    { key: 'openViolations', label: 'Open findings' },
    { key: 'repeated', label: 'Repeated' },
  ]

  const componentColumns = [
    {
      key: 'name',
      label: 'Component',
      className: 'data-table__mono',
      render: (c) => (
        <span className="trk-comp">
          {c.name}
          {c.note && <span className="trk-comp__note">{c.note}</span>}
        </span>
      ),
      sortValue: (c) => c.name,
      searchValue: (c) => `${c.name} ${c.note}`,
    },
    { key: 'group', label: 'Group' },
    { key: 'since', label: 'Since', className: 'data-table__mono' },
    { key: 'uses', label: 'Uses' },
    { key: 'prs', label: 'PRs' },
    { key: 'developers', label: 'Developers' },
    { key: 'teams', label: 'Teams' },
    {
      key: 'firstUsed',
      label: 'First used',
      render: (c) => (c.firstUsed ? fmtDate(c.firstUsed) : ''),
      sortValue: (c) => (c.firstUsed ? new Date(c.firstUsed).getTime() : Infinity),
    },
  ]

  const TABS = {
    prs: { columns: prColumns, rows: prRows, key: (r) => r.id, title: 'Pull requests', empty: 'No pull requests match.' },
    developers: { columns: devColumns, rows: devRows, key: (r) => r.id, title: 'Developers', empty: 'No developers match.' },
    components: { columns: componentColumns, rows: componentRows, key: (r) => r.name, title: 'Component consumption', empty: 'No components match.' },
  }
  const tab = TABS[subTab] ?? TABS.prs

  const filtered = tab.rows.filter((r) => matchesQuery(r, tab.columns, query))
  const sorted =
    subTab === 'prs'
      ? [...filtered].sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt))
      : subTab === 'components'
        ? [...filtered].sort((a, b) => b.uses - a.uses)
        : [...filtered].sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))
  const shown = pageSize === -1 || subTab !== 'prs' ? sorted : sorted.slice(0, pageSize)

  return (
    <>
      <div className="kpi-row">
        <KpiCell
          label="Arvo adoption"
          value={`${kpis.mAdoption.current}%`}
          delta={formatMovement(kpis.mAdoption, 'pp')}
          deltaLabel="vs same point last month"
          favourability={kpis.mAdoption.favourability}
          spark={kpis.adoption.values}
          caption="Share of UI component uses in merged PRs"
        />
        <KpiCell
          label="Arvo uses"
          value={kpis.mArvo.current}
          delta={formatMovement(kpis.mArvo)}
          deltaLabel="vs same point last month"
          favourability={kpis.mArvo.favourability}
          spark={kpis.arvoUses.values}
          caption="Component instances added this month"
        />
        <KpiCell
          label="Legacy uses"
          value={kpis.mLegacy.current}
          delta={formatMovement(kpis.mLegacy)}
          deltaLabel="vs same point last month"
          /* Down is favourable here. Declared, not inferred. */
          favourability={kpis.mLegacy.favourability}
          spark={kpis.legacyUses.values}
          caption="Non-Arvo controls still being added"
        />
        <KpiCell
          label="Merged PRs"
          value={kpis.mPrs.current}
          delta={formatMovement(kpis.mPrs)}
          deltaLabel="vs same point last month"
          spark={kpis.prCount.values}
          caption="This month, all repositories"
        />
        <KpiCell
          label="Developers shipping Arvo"
          value={kpis.mDevs.current}
          delta={formatMovement(kpis.mDevs)}
          deltaLabel="vs same point last month"
          favourability={kpis.mDevs.favourability}
          spark={kpis.activeDevs.values}
          caption={`of ${developers.length} in the directory`}
        />
        <KpiCell
          label="Catalogue reach"
          ratio={{ count: PUBLIC_COMPONENTS.length - kpis.unusedCount, total: PUBLIC_COMPONENTS.length }}
          caption="Components used at least once in a year"
          favourability={kpis.unusedCount > 8 ? 'caution' : 'favorable'}
        />
      </div>

      <ExpandableTile
        id="adoption"
        title={tab.title}
        note={`${sorted.length} of ${tab.rows.length}`}
        expandedId={expandedId}
        onToggle={setExpandedId}
        canExpand={sorted.length > 0}
        actions={
          <>
            <ArvoSearch
              placeholder="Search…"
              value={query}
              onInput={(event) => setQuery(event?.target?.value ?? '')}
              onClear={() => setQuery('')}
            />
            <span className="tile-actions__sep" aria-hidden="true" />
            <Hint
              text={
                subTab === 'developers'
                  ? 'Adoption is the share of UI component uses that were Arvo, across this person’s merged PRs. Trend is this month against last. Read them together — the trend is what says whether someone needs help or is already on their way.'
                  : subTab === 'components'
                    ? 'Uses counts instances, not files. A component with zero uses after a year is the most actionable row here: undiscovered, undocumented, or never needed.'
                    : 'Adoption is weighted by uses, not by distinct component names — a PR that used ArvoButton eleven times and one legacy grid once is mostly Arvo. A PR that touched no UI shows “no UI” rather than 0%.'
              }
            />
          </>
        }
      >
        <div className="trk-filters">
          {subTab !== 'components' && (
            <>
              <ArvoSelect label="Team" items={withAny(TEAMS.map((t) => ({ id: t.id, value: t.id, label: t.name })), 'Any team')} value={filters.team} onChange={({ value }) => set('team')(value)} />
              <ArvoSelect label="Developer" items={withAny(toStringItems(developers.map((d) => d.name)), 'Anyone')} value={filters.developer} onChange={({ value }) => set('developer')(value)} />
            </>
          )}
          {subTab === 'prs' && (
            <ArvoSelect label="Repository" items={withAny(toStringItems(repositories), 'Any repository')} value={filters.repository} onChange={({ value }) => set('repository')(value)} />
          )}
          {subTab === 'components' && (
            <ArvoSelect label="Group" items={withAny(toStringItems(COMPONENT_GROUPS), 'Any group')} value={filters.group} onChange={({ value }) => set('group')(value)} />
          )}
          {activeFilterCount > 0 && (
            <ArvoButton className="trk-filters__clear" variant="inline" size="sm" label={`Clear ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`} onClick={clearAll} />
          )}
        </div>

        {subTab === 'components' && kpis.unusedCount > 0 && (
          /* Stated, not left to be noticed. The zero-use rows are sorted to the
             bottom of a table people read from the top, so the finding that
             matters most to a design system team is the one nobody scrolls to. */
          <div className="trk-banner" role="status">
            <span className="o9con o9con-info-circle trk-banner__ico" aria-hidden="true" />
            <div>
              <p className="trk-banner__title">
                {kpis.unusedCount} of {PUBLIC_COMPONENTS.length} components have not been used once this year
              </p>
              <p className="trk-banner__text">
                Sort by <strong>Uses</strong> ascending to see them. Each is a question rather than a
                failure: undiscovered, undocumented, or genuinely not needed — and the third answer is
                a perfectly good one, it just means the catalogue can get smaller.
              </p>
            </div>
          </div>
        )}

        <DataTable
          columns={tab.columns}
          rows={shown}
          rowKey={tab.key}
          query={query}
          rowClassName={(r) => (subTab === 'components' && r.uses === 0 ? 'trk-row--quiet' : '')}
          emptyTitle={query || activeFilterCount ? 'No matches' : 'Nothing yet'}
          emptyMessage={query ? `Nothing matches “${query}”.` : tab.empty}
        />
        {subTab === 'prs' && sorted.length > 10 && (
          <PageSizeSelect value={pageSize} onChange={setPageSize} total={sorted.length} shown={shown.length} />
        )}
      </ExpandableTile>

      <DeveloperDetail
        developer={openDev}
        isOpen={!!openDev}
        onClose={() => setOpenDev(null)}
      />
    </>
  )
}
