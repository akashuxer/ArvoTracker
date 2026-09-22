import { useMemo, useState } from 'react'
import { ArvoButton, ArvoIconButton, ArvoSearch, ArvoSelect, useArvoToast } from '@arvo/react'
import { ConfirmDialog, DataTable, ExpandableTile, KpiCell, PageSizeSelect, ViewLoading, matchesQuery } from '@o9qa/kit'
import { useTracker } from '../data/store'
import { AREAS_OF_WORK, CLOSED_STATUSES, PRIORITIES, PRIORITY, STATUSES, STATUS, toItems, toStringItems } from '../data/enums'
import { OWNERS, RELEASES, TEAM, TEAMS } from '../data/mock'
import { PriorityBadge, StatusBadge, TypeMark, daysUntil, fmtDate, timeAgo } from '../components/marks'
import KanbanBoard from '../components/KanbanBoard'
import WorkItemDetail from '../components/WorkItemDetail'

/**
 * Roadmap -- every Arvo work item, in one master view.
 *
 * The five tabs are filters over one array, not five datasets. Everything on
 * screen (the summary cards, the table, the board) reads the same filtered list,
 * so a count can never disagree with the rows beneath it.
 */

const ANY = '__any'
const withAny = (items, label) => [{ id: ANY, value: ANY, label }, ...items]

export default function RoadmapView({ subTab = 'all', onEditItem }) {
  const { status, workItems, deleteWorkItem } = useTracker()
  const toast = useArvoToast()

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ area: ANY, priority: ANY, status: ANY, team: ANY, owner: ANY, release: ANY })
  const [mode, setMode] = useState('table')
  const [expandedId, setExpandedId] = useState(null)
  const [pageSize, setPageSize] = useState(25)
  const [openItem, setOpenItem] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))
  const activeFilterCount = Object.values(filters).filter((v) => v !== ANY).length

  /* The tab narrows by type; the selects narrow further. Applied in one place so
     the KPI row above the table describes exactly what the table shows. */
  const scoped = useMemo(
    () =>
      workItems.filter((w) => {
        if (subTab !== 'all' && w.type !== subTab) return false
        if (filters.area !== ANY && w.area !== filters.area) return false
        if (filters.priority !== ANY && w.priority !== filters.priority) return false
        if (filters.status !== ANY && w.status !== filters.status) return false
        if (filters.team !== ANY && w.requestingTeam !== filters.team) return false
        if (filters.owner !== ANY && w.owner !== filters.owner) return false
        if (filters.release !== ANY && w.targetRelease !== filters.release) return false
        return true
      }),
    [workItems, subTab, filters]
  )

  const columns = useMemo(
    () => [
      {
        key: 'id',
        label: 'ID',
        className: 'data-table__mono trk-col--meta',
        /* Sorts on the number so #451 follows #98 rather than preceding it. */
        sortValue: (w) => Number(String(w.id).replace(/\D/g, '')),
      },
      {
        key: 'title',
        label: 'Title',
        className: 'trk-col-title trk-col--key',
        render: (w) => (
          <button type="button" className="link-cell" onClick={() => setOpenItem(w)}>
            {w.title}
          </button>
        ),
        searchValue: (w) => `${w.title} ${w.problem}`,
        sortValue: (w) => w.title,
      },
      { key: 'type', label: 'Type', className: 'trk-col--sep', headerClassName: 'trk-col--sep', render: (w) => <TypeMark type={w.type} />, sortValue: (w) => w.type },
      { key: 'area', label: 'Area' },
      { key: 'component', label: 'Component', className: 'data-table__mono trk-col--meta' },
      {
        key: 'priority',
        label: 'Priority',
        className: 'trk-col--sep',
        headerClassName: 'trk-col--sep',
        render: (w) => <PriorityBadge priority={w.priority} />,
        /* Sorts by severity of the priority, not alphabetically -- "Critical"
           before "High" before "Low" is the only order anyone means. */
        sortValue: (w) => PRIORITY[w.priority]?.rank ?? 9,
        searchValue: (w) => PRIORITY[w.priority]?.label ?? '',
      },
      {
        key: 'status',
        label: 'Status',
        render: (w) => <StatusBadge status={w.status} />,
        sortValue: (w) => STATUSES.findIndex((s) => s.id === w.status),
        searchValue: (w) => STATUS[w.status]?.label ?? '',
      },
      { key: 'owner', label: 'Owner', className: 'trk-col--sep', headerClassName: 'trk-col--sep' },
      {
        key: 'requestingTeam',
        label: 'Requested by',
        className: 'trk-col--meta',
        render: (w) => `${w.requestedBy} · ${TEAM[w.requestingTeam]?.name ?? ''}`,
        searchValue: (w) => `${w.requestedBy} ${TEAM[w.requestingTeam]?.name ?? ''}`,
      },
      { key: 'targetRelease', label: 'Target', className: 'data-table__mono trk-col--sep', headerClassName: 'trk-col--sep' },
      {
        key: 'requiredBy',
        label: 'Required by',
        render: (w) => {
          if (!w.requiredBy) return ''
          const left = daysUntil(w.requiredBy)
          const isLate = left < 0 && !CLOSED_STATUSES.has(w.status)
          const isSoon = left >= 0 && left <= 14 && !CLOSED_STATUSES.has(w.status)
          /* A date that has passed on something still open is the one fact in
             this table worth tinting. It is interface state -- a deadline
             condition, not a measurement -- so it takes the semantic palette,
             and the date itself is always shown beside it. */
          return (
            <span className={isLate ? 'trk-date--late' : isSoon ? 'trk-date--soon' : undefined}>
              {fmtDate(w.requiredBy)}
              {isLate && <span className="trk-date__note"> overdue</span>}
            </span>
          )
        },
        sortValue: (w) => (w.requiredBy ? new Date(w.requiredBy).getTime() : Infinity),
        searchValue: (w) => fmtDate(w.requiredBy),
      },
      {
        key: 'updated',
        label: 'Updated',
        className: 'trk-col--meta',
        render: (w) => timeAgo(w.updated),
        sortValue: (w) => new Date(w.updated).getTime(),
      },
      {
        key: 'actions',
        label: '',
        isSortable: false,
        className: 'data-table__action',
        render: (w) => (
          <span className="row-actions">
            <ArvoIconButton icon="pencil" tooltip={`Edit ${w.id}`} variant="tertiary" size="sm" onClick={() => onEditItem(w)} />
            <ArvoIconButton icon="bin" tooltip={`Delete ${w.id}`} variant="danger-tertiary" size="sm" onClick={() => setPendingDelete(w)} />
          </span>
        ),
      },
    ],
    [onEditItem]
  )

  const rows = useMemo(() => scoped.filter((w) => matchesQuery(w, columns, query)), [scoped, columns, query])
  const shown = pageSize === -1 ? rows : rows.slice(0, pageSize)

  /* Summary cards. Counted over the tab's scope so the cards describe what you
     are looking at, not the whole backlog -- a "3 open bugs" card above a
     filtered table of enhancements would be a lie about a real number. */
  const summary = useMemo(() => {
    const open = scoped.filter((w) => !CLOSED_STATUSES.has(w.status))
    return {
      openBugs: open.filter((w) => w.type === 'bug').length,
      awaitingReview: open.filter((w) => w.type === 'new-request' && (w.status === 'new' || w.status === 'under-review')).length,
      newRequests: scoped.filter((w) => w.type === 'new-request').length,
      enhancementsInProgress: open.filter((w) => w.type === 'enhancement' && ['in-design', 'ready-for-dev', 'in-development', 'validation'].includes(w.status)).length,
      upcoming: scoped.filter((w) => w.type === 'upcoming').length,
      blocked: scoped.filter((w) => w.status === 'blocked').length,
      total: scoped.length,
    }
  }, [scoped])

  if (status === 'loading') return <ViewLoading message="Loading the roadmap…" />

  return (
    <>
      <div className="kpi-row">
        <KpiCell
          label="Open bugs"
          value={summary.openBugs}
          caption="Reported defects not yet released or deferred"
          /* Declared, never inferred: for a defect count a rise is
             unfavourable, and only the caller knows that. */
          favourability={summary.openBugs > 4 ? 'unfavorable' : undefined}
        />
        <KpiCell
          label="Awaiting review"
          value={summary.awaitingReview}
          caption="New requests nobody has triaged yet"
          favourability={summary.awaitingReview > 2 ? 'caution' : undefined}
        />
        <KpiCell
          label="Enhancements in progress"
          value={summary.enhancementsInProgress}
          caption="In design, ready, in development or validating"
        />
        <KpiCell label="Upcoming items" value={summary.upcoming} caption="Announced, not yet started" />
        <KpiCell
          label="Blocked"
          ratio={{ count: summary.blocked, total: summary.total }}
          caption="Waiting on something outside the team"
          favourability={summary.blocked ? 'unfavorable' : undefined}
        />
      </div>

      <ExpandableTile
        id="roadmap"
        title={mode === 'table' ? 'Work items' : 'Work items by status'}
        note={`${rows.length} of ${workItems.length}`}
        expandedId={expandedId}
        onToggle={setExpandedId}
        canExpand={rows.length > 0}
        actions={
          <>
            <ArvoSearch
              placeholder="Search title, problem, owner…"
              value={query}
              onInput={(event) => setQuery(event?.target?.value ?? '')}
              onClear={() => setQuery('')}
            />
            <span className="tile-actions__sep" aria-hidden="true" />
            {/* Two representations of the same filtered rows. Not a filter, so
                it is a pair of pressed states rather than another select. */}
            <ArvoIconButton
              icon="table"
              tooltip="Table view"
              variant="tertiary"
              size="sm"
              isSelected={mode === 'table'}
              onClick={() => setMode('table')}
            />
            <ArvoIconButton
              icon="columns"
              tooltip="Kanban view, grouped by status"
              variant="tertiary"
              size="sm"
              isSelected={mode === 'kanban'}
              onClick={() => setMode('kanban')}
            />
          </>
        }
      >
        <div className="trk-filters">
          <ArvoSelect label="Area" items={withAny(toStringItems(AREAS_OF_WORK), 'Any area')} value={filters.area} onChange={({ value }) => set('area')(value)} />
          <ArvoSelect label="Priority" items={withAny(toItems(PRIORITIES), 'Any priority')} value={filters.priority} onChange={({ value }) => set('priority')(value)} />
          <ArvoSelect label="Status" items={withAny(toItems(STATUSES), 'Any status')} value={filters.status} onChange={({ value }) => set('status')(value)} />
          <ArvoSelect label="Requesting team" items={withAny(TEAMS.map((t) => ({ id: t.id, value: t.id, label: t.name })), 'Any team')} value={filters.team} onChange={({ value }) => set('team')(value)} />
          <ArvoSelect label="Owner" items={withAny(toStringItems(OWNERS), 'Anyone')} value={filters.owner} onChange={({ value }) => set('owner')(value)} />
          <ArvoSelect label="Target release" items={withAny(toStringItems(RELEASES), 'Any release')} value={filters.release} onChange={({ value }) => set('release')(value)} />
          {activeFilterCount > 0 && (
            <ArvoButton
              className="trk-filters__clear"
              variant="inline"
              size="sm"
              label={`Clear ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`}
              onClick={() => setFilters({ area: ANY, priority: ANY, status: ANY, team: ANY, owner: ANY, release: ANY })}
            />
          )}
        </div>

        {mode === 'table' ? (
          <>
            <DataTable
              columns={columns}
              rows={shown}
              rowKey={(w) => w.id}
              rowClassName={(w) => (openItem?.id === w.id ? 'trk-row--open' : '')}
              query={query}
              rowActions={{ onShowDetails: setOpenItem, onEdit: onEditItem, onDelete: setPendingDelete }}
              emptyTitle={query || activeFilterCount ? 'No matches' : 'Nothing here yet'}
              emptyMessage={
                query
                  ? `No work items match “${query}”.`
                  : activeFilterCount
                    ? 'No work items match these filters. Clearing one usually brings the list back.'
                    : 'Raise the first item with Add item.'
              }
            />
            {rows.length > 10 && (
              <PageSizeSelect value={pageSize} onChange={setPageSize} total={rows.length} shown={shown.length} />
            )}
          </>
        ) : (
          <KanbanBoard items={rows} onOpen={setOpenItem} />
        )}
      </ExpandableTile>

      <WorkItemDetail
        item={openItem}
        isOpen={!!openItem}
        onClose={() => setOpenItem(null)}
        onEdit={(w) => {
          setOpenItem(null)
          onEditItem(w)
        }}
      />

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Delete this work item?"
        subject={pendingDelete ? `${pendingDelete.id} — ${pendingDelete.title}` : ''}
        message="will be removed along with its decision history. This cannot be undone."
        onConfirm={() => {
          deleteWorkItem(pendingDelete.id)
          toast.show({ type: 'positive', title: 'Work item deleted', message: pendingDelete.id })
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
