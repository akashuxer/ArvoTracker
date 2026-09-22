import { useMemo } from 'react'
import { ArvoButton, ArvoSelect } from '@arvo/react'
import DetailPanel from './DetailPanel'
import Timeline from './Timeline'
import { DetailList, DetailSection, Field } from './DetailList'
import { SeverityMark, StatusBadge, ViolationStatusBadge, fmtDateTime, timeAgo } from './marks'
import { OWNERS, TEAM } from '../data/mock'
import { RULE } from '../data/rules'
import { SETTLED_VIOLATION_STATUSES, VIOLATION_STATUSES, toItems, toStringItems } from '../data/enums'
import { useTracker } from '../data/store'

/**
 * One violation, opened.
 *
 * The order is the order the reader needs it in: what was found, why it counts,
 * where it is, what to use instead, what to do. The rule text comes from the
 * registry rather than from the row, so improving an explanation improves every
 * past finding at once.
 *
 * The author is shown here, once, because someone has to be asked. It is not
 * aggregated anywhere -- Analytics counts teams, repositories and rules.
 */
export default function ViolationDetail({ violation, isOpen, onClose, onOpenItem, relatedItems = [] }) {
  const { violations, setViolationStatus, assignViolation } = useTracker()
  const rule = violation ? RULE[violation.ruleId] : null

  /* Every earlier sighting of this rule in this file. The count on the row says
     "repeated"; this says how often, and since when. */
  const history = useMemo(() => {
    if (!violation) return []
    return violations
      .filter(
        (v) =>
          v.id !== violation.id &&
          v.repository === violation.repository &&
          v.file === violation.file &&
          v.ruleId === violation.ruleId
      )
      .sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt))
  }, [violation, violations])

  /* Roadmap items that name this rule. A rule tripping repeatedly across teams
     usually means Arvo is missing something, and the item that would fix it is
     the most useful thing this panel can offer. Matched on the rule id appearing
     in the item's own text, so the link exists because someone wrote it down --
     not because of a mapping that can silently go stale. */
  const related = useMemo(() => {
    if (!violation) return []
    const needle = violation.ruleId
    return relatedItems.filter((w) =>
      [w.title, w.problem, ...(w.notes ?? []).map((n) => n.text)].join(' ').includes(needle)
    )
  }, [violation, relatedItems])

  return (
    <DetailPanel
      title={violation ? `${violation.id} · ${violation.ruleId}` : 'Violation'}
      icon="exclamation-triangle"
      size={620}
      isOpen={isOpen}
      onClose={onClose}
    >
      {violation && (
        <div className="trk-detail">
          <header className="trk-detail__head">
            <h2 className="trk-detail__title">{rule?.title ?? violation.category}</h2>
            <div className="trk-detail__marks">
              <SeverityMark severity={violation.severity} />
              <ViolationStatusBadge status={violation.status} />
              {violation.isRepeated && <span className="trk-repeat">Repeated</span>}
            </div>
          </header>

          <DetailSection title="What was detected">
            <p className="trk-prose">
              {violation.message ||
                `${violation.category} in ${violation.file}, ${violation.occurrences} occurrence${violation.occurrences > 1 ? 's' : ''}.`}
            </p>
            <pre className="trk-code-block">
              <code>
                {violation.repository}/{violation.file}:{violation.line}
              </code>
            </pre>
          </DetailSection>

          <DetailSection title="Why this is an Arvo violation">
            <p className="trk-prose">{rule?.why}</p>
          </DetailSection>

          <DetailSection title="Approved Arvo alternative">
            <p className="trk-prose">{rule?.alternative}</p>
          </DetailSection>

          <DetailSection title="Recommended remediation">
            <p className="trk-prose">{rule?.fix}</p>
            {rule?.docs && (
              <p className="trk-prose trk-prose--quiet">
                Documentation: <code className="trk-code">{rule.docs}</code>
              </p>
            )}
          </DetailSection>

          <DetailSection title="Where it came from">
            <DetailList>
              <Field label="Repository">{violation.repository}</Field>
              <Field label="Product area">{violation.productArea}</Field>
              <Field label="Branch">{violation.branch}</Field>
              <Field label="Commit">{violation.commitId}</Field>
              <Field label="Commit message" isWide>{violation.commitMessage}</Field>
              <Field label="Author">{violation.author}</Field>
              <Field label="Team">{TEAM[violation.team]?.name}</Field>
              <Field label="Team contact">{TEAM[violation.team]?.contact}</Field>
              <Field label="Detected">{fmtDateTime(violation.detectedAt)}</Field>
              <Field label="First detected">
                {`${fmtDateTime(violation.firstDetected)} (${timeAgo(violation.firstDetected)})`}
              </Field>
            </DetailList>
          </DetailSection>

          <DetailSection title="Previous occurrences">
            {history.length ? (
              <>
                <p className="trk-prose trk-prose--quiet">
                  Seen {history.length} time{history.length > 1 ? 's' : ''} before in this file. That
                  is a signal the guidance has not landed — worth a conversation rather than another
                  ticket.
                </p>
                {/* A timeline, because these ARE events in sequence and a
                    flat list made every sighting look equally recent. The one
                    on screen is marked, so the reader can see where in its own
                    history this finding sits. */}
                <Timeline
                  items={[
                    {
                      id: violation.id,
                      label: violation.commitId || violation.id,
                      at: fmtDateTime(violation.detectedAt),
                      badge: <ViolationStatusBadge status={violation.status} />,
                      text: 'This one.',
                      tone: 'current',
                    },
                    ...history.slice(0, 8).map((v) => ({
                      id: v.id,
                      label: v.commitId || v.id,
                      at: fmtDateTime(v.detectedAt),
                      badge: <ViolationStatusBadge status={v.status} />,
                      tone: SETTLED_VIOLATION_STATUSES.has(v.status) ? 'positive' : undefined,
                    })),
                  ]}
                />
                {history.length > 8 && (
                  <p className="trk-prose trk-prose--quiet">
                    Showing the 8 most recent of {history.length}.
                  </p>
                )}
              </>
            ) : (
              <p className="trk-prose trk-prose--quiet">First time this rule has tripped here.</p>
            )}
          </DetailSection>

          {related.length > 0 && (
            <DetailSection title="Roadmap items that would remove this class of finding">
              <ul className="trk-list">
                {related.map((w) => (
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
            </DetailSection>
          )}

          <DetailSection title="Owner and resolution">
            <div className="trk-form-grid">
              <ArvoSelect
                label="Status"
                items={toItems(VIOLATION_STATUSES)}
                value={violation.status}
                isFullWidth
                onChange={({ value }) => setViolationStatus(violation.id, value)}
              />
              <ArvoSelect
                label="Assigned owner"
                items={[{ id: '', value: '', label: 'Unassigned' }, ...toStringItems([...new Set([...OWNERS, TEAM[violation.team]?.contact].filter(Boolean))])]}
                value={violation.assignee}
                isFullWidth
                onChange={({ value }) => assignViolation(violation.id, value)}
              />
            </div>
            <p className="field-hint">
              “Accepted exception” and “False positive” both settle a finding. An exception is a
              decision the team argued and won; a false positive is Arvo’s bug, not theirs.
            </p>
          </DetailSection>

          <div className="form-actions">
            <ArvoButton variant="secondary" label="Close" onClick={onClose} />
          </div>
        </div>
      )}
    </DetailPanel>
  )
}
