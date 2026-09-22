import { useMemo } from 'react'
import { ArvoSelect } from '@arvo/react'
import DetailPanel from './DetailPanel'
import PanelSections from './PanelSections'
import Timeline from './Timeline'
import { DetailList, Field } from './DetailList'
import { SeverityMark, StatusBadge, ViolationStatusBadge, fmtDateTime, timeAgo } from './marks'
import { OWNERS, TEAM } from '../data/mock'
import { RULE } from '../data/rules'
import { SETTLED_VIOLATION_STATUSES, VIOLATION_STATUSES, toItems, toStringItems } from '../data/enums'
import { useTracker } from '../data/store'

/**
 * One violation.
 *
 * Two halves. What you opened it for is at the top and always visible: where
 * the problem is, and what to do about it. Everything else -- why the rule
 * exists, where the change came from, how often this has happened -- is
 * reference, and sits collapsed underneath.
 *
 * The prose that used to introduce every section is gone. It explained the
 * design to a reader who wanted the file path, and it appeared on every one of
 * a thousand findings. The reasoning lives in these comments, where it belongs.
 */
export default function ViolationDetail({ violation, isOpen, onClose, onOpenItem, relatedItems = [] }) {
  const { violations, setViolationStatus, assignViolation } = useTracker()
  const rule = violation ? RULE[violation.ruleId] : null

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

  /* Roadmap items naming this rule. Matched on the id appearing in the item's
     own text, so the link exists because somebody wrote it down rather than
     because of a mapping that can silently go stale. */
  const related = useMemo(() => {
    if (!violation) return []
    return relatedItems.filter((w) =>
      [w.title, w.problem, ...(w.notes ?? []).map((n) => n.text)]
        .join(' ')
        .includes(violation.ruleId)
    )
  }, [violation, relatedItems])

  return (
    <DetailPanel
      title={violation ? violation.id : 'Violation'}
      icon="exclamation-triangle"
      size={560}
      isOpen={isOpen}
      onClose={onClose}
    >
      {violation && (
        <div className="trk-detail">
          <header className="trk-detail__head">
            <span className="trk-detail__eyebrow">{violation.ruleId}</span>
            <h2 className="trk-detail__title">{rule?.title ?? violation.category}</h2>
            <div className="trk-detail__marks">
              <SeverityMark severity={violation.severity} />
              <ViolationStatusBadge status={violation.status} />
              {violation.isRepeated && <span className="trk-repeat">Repeated</span>}
            </div>
          </header>

          {/* The two things somebody opens a finding to get. */}
          <div className="trk-action">
            <p className="trk-action__where">
              <code>
                {violation.file}:{violation.line}
              </code>
              <span className="trk-action__count">
                {violation.occurrences} occurrence{violation.occurrences > 1 ? 's' : ''}
              </span>
            </p>
            <p className="trk-action__fix">{rule?.fix}</p>
          </div>

          <div className="trk-form-grid">
            <ArvoSelect
              label="Status"
              items={toItems(VIOLATION_STATUSES)}
              value={violation.status}
              isFullWidth
              onChange={({ value }) => setViolationStatus(violation.id, value)}
            />
            <ArvoSelect
              label="Owner"
              items={[
                { id: '', value: '', label: 'Unassigned' },
                ...toStringItems([...new Set([...OWNERS, TEAM[violation.team]?.contact].filter(Boolean))]),
              ]}
              value={violation.assignee}
              isFullWidth
              onChange={({ value }) => assignViolation(violation.id, value)}
            />
          </div>

          <PanelSections
            items={[
              {
                id: 'why',
                title: 'Why this is a violation',
                icon: 'question-circle',
                content: (
                  <>
                    <p className="trk-prose">{rule?.why}</p>
                    <p className="trk-prose">
                      <strong>Use instead:</strong> {rule?.alternative}
                    </p>
                    {rule?.docs && (
                      <p className="trk-prose trk-prose--quiet">
                        <code className="trk-code">{rule.docs}</code>
                      </p>
                    )}
                  </>
                ),
              },
              {
                id: 'origin',
                title: 'Where it came from',
                icon: 'code',
                content: (
                  <DetailList>
                    <Field label="Repository">{violation.repository}</Field>
                    <Field label="Product area">{violation.productArea}</Field>
                    <Field label="Branch">{violation.branch}</Field>
                    <Field label="Commit">{violation.commitId}</Field>
                    <Field label="Message" isWide>{violation.commitMessage}</Field>
                    <Field label="Author">{violation.author}</Field>
                    <Field label="Team">{TEAM[violation.team]?.name}</Field>
                    <Field label="Contact">{TEAM[violation.team]?.contact}</Field>
                    <Field label="Detected">{fmtDateTime(violation.detectedAt)}</Field>
                    <Field label="First seen">{timeAgo(violation.firstDetected)}</Field>
                  </DetailList>
                ),
              },
              history.length && {
                id: 'history',
                title: 'Previous occurrences',
                icon: 'history',
                badge: { message: String(history.length) },
                content: (
                  <Timeline
                    items={[
                      {
                        id: violation.id,
                        label: violation.commitId || violation.id,
                        at: fmtDateTime(violation.detectedAt),
                        badge: <ViolationStatusBadge status={violation.status} />,
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
                ),
              },
              related.length && {
                id: 'roadmap',
                title: 'Not theirs to fix',
                icon: 'clipboard',
                badge: { message: String(related.length), semanticType: 'info' },
                content: (
                  <>
                    <p className="trk-prose trk-prose--quiet">
                      A roadmap item covers this rule, so the finding is the design system’s to
                      answer.
                    </p>
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
                  </>
                ),
              },
            ]}
          />
        </div>
      )}
    </DetailPanel>
  )
}
