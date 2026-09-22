import { useMemo } from 'react'
import { ArvoButton } from '@arvo/react'
import DetailPanel from './DetailPanel'
import Timeline from './Timeline'
import { DetailList, DetailSection, Field } from './DetailList'
import { AdoptionBar, SeverityMark, ViolationStatusBadge, fmtDateTime, timeAgo } from './marks'
import { COMPONENT, LEGACY } from '../data/catalog'
import { TEAM, adoptionOf, countOf } from '../data/mock'
import { RULE } from '../data/rules'
import { SETTLED_VIOLATION_STATUSES } from '../data/enums'
import { useTracker } from '../data/store'

/**
 * One pull request, opened.
 *
 * The unit of adoption, so this is where "what did this change actually build
 * with" gets answered: which Arvo components it reached for and how many times,
 * which legacy controls it still used and what each of those has an Arvo
 * equivalent in, and what the scanner found on the way past.
 *
 * Counted by USES rather than by distinct names, the same way the ratio is, or
 * a PR that used ArvoButton eleven times and one legacy grid once would read as
 * an even split.
 */
export default function PullRequestDetail({ pr, isOpen, onClose, onOpenDeveloper }) {
  const { violations, pushes } = useTracker()

  const data = useMemo(() => {
    if (!pr) return null
    const mine = violations.filter((v) => v.prId === pr.id)
    const adoption = adoptionOf(pr)
    return {
      adoption,
      arvo: Object.entries(pr.arvoUsed).sort((a, b) => b[1] - a[1]),
      legacy: Object.entries(pr.legacyUsed).sort((a, b) => b[1] - a[1]),
      violations: mine,
      open: mine.filter((v) => !SETTLED_VIOLATION_STATUSES.has(v.status)),
      /* The scanner runs per push, so a PR's findings arrive across several of
         them. Showing the pushes is what makes a repeated finding legible as
         "raised again on the next push" rather than as two identical rows. */
      pushes: pushes
        .filter((p) => p.prId === pr.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    }
  }, [pr, violations, pushes])

  return (
    <DetailPanel
      title={pr ? `${pr.id} · ${pr.title}` : 'Pull request'}
      icon="code"
      size={620}
      isOpen={isOpen}
      onClose={onClose}
    >
      {pr && data && (
        <div className="trk-detail">
          <header className="trk-detail__head">
            <h2 className="trk-detail__title">{pr.title}</h2>
            <p className="trk-prose trk-prose--quiet">
              {pr.repository} · {pr.branch}
            </p>
            {data.adoption ? (
              <div className="trk-progress trk-progress--lg">
                <AdoptionBar arvo={data.adoption.arvo} legacy={data.adoption.legacy} />
                <span className="trk-progress__pct">{data.adoption.pct}%</span>
              </div>
            ) : (
              <p className="trk-prose trk-prose--quiet">
                This change touched no UI components, so it has no adoption ratio — a config or
                test change is not a failure to adopt.
              </p>
            )}
          </header>

          <DetailSection title="Who and when">
            <DetailList>
              <Field label="Author">
                {/* Still reachable, just no longer the only link in the row --
                    the PR is what the table is a list of. */}
                <button type="button" className="link-cell" onClick={() => onOpenDeveloper?.(pr.author)}>
                  {pr.author}
                </button>
              </Field>
              <Field label="Team">{TEAM[pr.team]?.name}</Field>
              <Field label="Product area">{pr.productArea}</Field>
              <Field label="Files changed">{pr.filesChanged}</Field>
              <Field label="Opened">{fmtDateTime(pr.openedAt)}</Field>
              <Field label="State">
                {pr.status === 'merged' ? `merged ${timeAgo(pr.mergedAt)}` : pr.status}
              </Field>
            </DetailList>
          </DetailSection>

          <DetailSection title={`Arvo components used — ${countOf(pr.arvoUsed)} uses`}>
            {data.arvo.length ? (
              <ul className="trk-list">
                {data.arvo.map(([name, n]) => (
                  <li key={name}>
                    <span className="trk-rule-row">
                      <code className="trk-code">{name}</code>
                      <span className="trk-rule-row__title">
                        {COMPONENT[name]?.group}
                        {COMPONENT[name]?.isDeprecated ? ' · deprecated' : ''}
                      </span>
                      <span className="trk-rule-row__count">{n}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="trk-prose trk-prose--quiet">None.</p>
            )}
          </DetailSection>

          <DetailSection title={`Legacy controls still used — ${countOf(pr.legacyUsed)} uses`}>
            {data.legacy.length ? (
              <>
                <p className="trk-prose trk-prose--quiet">
                  Each of these has an Arvo equivalent today. Most predate it, which is why they are
                  here.
                </p>
                <ul className="trk-list">
                  {data.legacy.map(([name, n]) => (
                    <li key={name}>
                      <span className="trk-rule-row">
                        <code className="trk-code">{name}</code>
                        <span className="trk-rule-row__title">
                          use {LEGACY[name]?.useInstead ?? 'an Arvo equivalent'}
                        </span>
                        <span className="trk-rule-row__count">{n}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="trk-prose trk-prose--quiet">
                None — every UI control this change added is Arvo.
              </p>
            )}
          </DetailSection>

          {pr.usedInternal && (
            <DetailSection title="Internal component used directly">
              <p className="trk-prose">
                This change imported <code className="trk-code">{pr.usedInternal}</code>, which is
                exported so the public components can use it but is not part of the developer
                surface — it changes without notice. Use{' '}
                <code className="trk-code">{COMPONENT[pr.usedInternal]?.useInstead}</code> instead.
              </p>
            </DetailSection>
          )}

          <DetailSection title={`Findings — ${data.open.length} open of ${data.violations.length}`}>
            {data.violations.length ? (
              <ul className="trk-list">
                {data.violations.map((v) => (
                  <li key={v.id}>
                    <span className="trk-rule-row">
                      <code className="trk-code">{v.ruleId}</code>
                      <SeverityMark severity={v.severity} />
                      <span className="trk-rule-row__title">{RULE[v.ruleId]?.title}</span>
                      <ViolationStatusBadge status={v.status} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="trk-prose trk-prose--quiet">The scanner found nothing on this one.</p>
            )}
          </DetailSection>

          <DetailSection title="Pushes">
            <Timeline
              items={data.pushes.map((p, i) => ({
                id: p.id,
                label: p.commitId,
                at: fmtDateTime(p.timestamp),
                text: p.commitMessage,
                tone: i === 0 ? 'info' : undefined,
              }))}
            />
          </DetailSection>

          <div className="form-actions">
            <ArvoButton variant="secondary" label="Close" onClick={onClose} />
          </div>
        </div>
      )}
    </DetailPanel>
  )
}
