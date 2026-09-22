import { useMemo } from 'react'
import DetailPanel from './DetailPanel'
import PanelSections from './PanelSections'
import { DetailList, Field } from './DetailList'
import { Hint, MigrationBar, SeverityMark, StatusBadge, fmtDate, timeAgo } from './marks'
import { TEAM } from '../data/mock'
import { RULE } from '../data/rules'
import { SETTLED_VIOLATION_STATUSES } from '../data/enums'
import { useTracker } from '../data/store'

/**
 * One product area, opened.
 *
 * Everything here is derived from the other two sections rather than stored on
 * the area: its open violations come from the violation list, its blockers come
 * from the roadmap. That is what makes this the place a conversation can start
 * from -- the owner, the contact, what is in the way and who is already on it,
 * in one panel.
 */
export default function AreaDetail({ area, isOpen, onClose, onOpenItem }) {
  const { violations, workItems } = useTracker()

  const { open, byRule, blockers } = useMemo(() => {
    if (!area) return { open: [], byRule: [], blockers: [] }
    const mine = violations.filter((v) => v.productArea === area.id)
    const openViolations = mine.filter((v) => !SETTLED_VIOLATION_STATUSES.has(v.status))
    const counts = new Map()
    openViolations.forEach((v) => counts.set(v.ruleId, (counts.get(v.ruleId) ?? 0) + 1))
    return {
      open: openViolations,
      byRule: [...counts.entries()].sort((a, b) => b[1] - a[1]),
      blockers: workItems.filter((w) => area.dependencies.includes(w.id)),
    }
  }, [area, violations, workItems])

  const pct = area?.total ? Math.round((area.migrated / area.total) * 100) : 0

  return (
    <DetailPanel
      title={area ? area.name : 'Product area'}
      icon="grid"
      size={560}
      isOpen={isOpen}
      onClose={onClose}
    >
      {area && (
        <div className="trk-detail">
          <header className="trk-detail__head">
            <span className="trk-detail__eyebrow">{TEAM[area.team]?.name}</span>
            <h2 className="trk-detail__title">{area.name}</h2>
            <div className="trk-progress trk-progress--lg">
              <MigrationBar area={area} />
              <span className="trk-progress__pct">{pct}%</span>
            </div>
          </header>

          <div className="trk-action">
            <p className="trk-action__fix">{area.notes}</p>
          </div>

          <PanelSections
            items={[
              {
                id: 'migration',
                title: 'Migration',
                icon: 'repeat',
                badge: { message: `${area.migrated}/${area.total}` },
                content: (
                  <DetailList>
                    <Field label="Total UI areas">{area.total}</Field>
                    <Field label="Migrated">{area.migrated}</Field>
                    <Field label="Partially migrated">{area.partial}</Field>
                    <Field label="Legacy">{area.legacy}</Field>
                    <Field label="Blocked">{area.blocked}</Field>
                    <Field label="Target">{fmtDate(area.target)}</Field>
                    <Field label="Arvo version">{area.arvoVersion}</Field>
                    <Field label="Last activity">{timeAgo(area.lastActivity)}</Field>
                    <Field label="Owner">{area.owner}</Field>
                    <Field label="Contact">{TEAM[area.team]?.contact}</Field>
                  </DetailList>
                ),
              },
              {
                id: 'components',
                title: 'Components',
                icon: 'grid',
                badge: { message: String(area.components.migrated.length + area.components.legacy.length) },
                content: (
                  <>
                    <p className="trk-dl__key">On Arvo</p>
                    <ul className="trk-pills">
                      {area.components.migrated.map((c) => (
                        <li className="trk-pill" key={c}>{c}</li>
                      ))}
                      {!area.components.migrated.length && <li className="trk-muted">None yet.</li>}
                    </ul>
                    <p className="trk-dl__key trk-spaced">Still legacy</p>
                    <ul className="trk-pills">
                      {area.components.legacy.map((c) => (
                        <li className="trk-pill trk-pill--legacy" key={c}>{c}</li>
                      ))}
                      {!area.components.legacy.length && <li className="trk-muted">Nothing left.</li>}
                    </ul>
                  </>
                ),
              },
              byRule.length && {
                id: 'violations',
                title: 'Open findings',
                icon: 'exclamation-triangle',
                badge: { message: String(open.length), semanticType: 'warning' },
                content: (
                  <ul className="trk-list">
                    {byRule.map(([ruleId, count]) => (
                      <li key={ruleId}>
                        <span className="trk-rule-row">
                          <code className="trk-code">{ruleId}</code>
                          <SeverityMark severity={RULE[ruleId]?.severity} />
                          <span className="trk-rule-row__title">{RULE[ruleId]?.title}</span>
                          <span className="trk-rule-row__count">{count}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                id: 'roadmap',
                title: 'Waiting on Arvo',
                icon: 'clipboard',
                badge: blockers.length ? { message: String(blockers.length), semanticType: 'info' } : null,
                content: blockers.length ? (
                  <ul className="trk-list">
                    {blockers.map((w) => (
                      <li key={w.id}>
                        <span className="trk-rule-row">
                          <button type="button" className="link-cell" onClick={() => onOpenItem(w)}>
                            {w.id}
                          </button>
                          <StatusBadge status={w.status} />
                          <span className="trk-rule-row__title">{w.title}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="trk-prose trk-prose--quiet">
                    Nothing in Arvo is holding this area up.
                  </p>
                ),
              },
            ]}
          />

        </div>
      )}
    </DetailPanel>
  )
}
