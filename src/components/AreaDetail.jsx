import { useMemo } from 'react'
import { ArvoButton, ArvoPanel } from '@arvo/react'
import { DetailList, DetailSection, Field } from './DetailList'
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
    <ArvoPanel
      displayMode="overlay"
      placement="right"
      title={area ? area.name : 'Product area'}
      defaultSize={560}
      isOpen={isOpen}
      onClose={onClose}
    >
      {area && (
        <div className="trk-detail">
          <header className="trk-detail__head">
            <h2 className="trk-detail__title">{area.name}</h2>
            <p className="trk-prose">{area.notes}</p>
            <div className="trk-progress trk-progress--lg">
              <MigrationBar area={area} />
              <span className="trk-progress__pct">{pct}%</span>
            </div>
          </header>

          <DetailSection title="Ownership">
            <DetailList>
              <Field label="Team">{TEAM[area.team]?.name}</Field>
              <Field label="Owner">{area.owner}</Field>
              <Field label="Contact">{TEAM[area.team]?.contact}</Field>
              <Field label="Arvo version">{area.arvoVersion}</Field>
            </DetailList>
          </DetailSection>

          <DetailSection title="Migration">
            <DetailList>
              <Field label="Total UI areas">{area.total}</Field>
              <Field label="Migrated">{area.migrated}</Field>
              <Field label="Partially migrated">{area.partial}</Field>
              <Field label="Legacy">{area.legacy}</Field>
              <Field label="Blocked">{area.blocked}</Field>
              <Field label="Target completion">{fmtDate(area.target)}</Field>
              <Field label="Last activity">{`${fmtDate(area.lastActivity)} (${timeAgo(area.lastActivity)})`}</Field>
            </DetailList>
          </DetailSection>

          <DetailSection title="Components already on Arvo">
            {area.components.migrated.length ? (
              <ul className="trk-pills">
                {area.components.migrated.map((c) => (
                  <li className="trk-pill" key={c}>
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="trk-prose trk-prose--quiet">None yet.</p>
            )}
          </DetailSection>

          <DetailSection title="Still on legacy implementations">
            {area.components.legacy.length ? (
              <ul className="trk-pills">
                {area.components.legacy.map((c) => (
                  <li className="trk-pill trk-pill--legacy" key={c}>
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="trk-prose trk-prose--quiet">Nothing left — this area is done.</p>
            )}
          </DetailSection>

          <DetailSection title="Known violations">
            {byRule.length ? (
              <>
                <p className="trk-prose trk-prose--quiet">
                  {open.length} open, across {byRule.length} rule{byRule.length > 1 ? 's' : ''}. Most
                  of a repeated count is usually one missing token or prop, not many separate
                  mistakes.
                </p>
                <ul className="trk-list">
                  {byRule.map(([ruleId, count]) => (
                    <li key={ruleId}>
                      <span className="trk-rule-row">
                        <code className="trk-code">{ruleId}</code>
                        <SeverityMark severity={RULE[ruleId]?.severity} />
                        <span className="trk-rule-row__title">{RULE[ruleId]?.title}</span>
                        <span className="trk-rule-row__count">
                          {count} open
                          <Hint text={RULE[ruleId]?.fix ?? ''} />
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="trk-prose trk-prose--quiet">No open violations in this area.</p>
            )}
          </DetailSection>

          <DetailSection title="Related roadmap items">
            {blockers.length ? (
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
                Nothing in Arvo is holding this area up. The remaining work is the team's own.
              </p>
            )}
          </DetailSection>

          <div className="form-actions">
            <ArvoButton variant="secondary" label="Close" onClick={onClose} />
          </div>
        </div>
      )}
    </ArvoPanel>
  )
}
