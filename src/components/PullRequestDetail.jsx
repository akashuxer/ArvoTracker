import { useMemo } from 'react'
import DetailPanel from './DetailPanel'
import PanelSections from './PanelSections'
import Timeline from './Timeline'
import { DetailList, Field } from './DetailList'
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
            <span className="trk-detail__eyebrow">
              {pr.id} · {pr.repository}
            </span>
            <h2 className="trk-detail__title">{pr.title}</h2>
            {data.adoption && (
              <div className="trk-progress trk-progress--lg">
                <AdoptionBar arvo={data.adoption.arvo} legacy={data.adoption.legacy} />
                <span className="trk-progress__pct">{data.adoption.pct}%</span>
              </div>
            )}
          </header>

          <div className="trk-action">
            <p className="trk-action__where">
              <code>{pr.branch}</code>
              <span className="trk-action__count">
                {pr.status === 'merged' ? `merged ${timeAgo(pr.mergedAt)}` : pr.status}
              </span>
            </p>
            <p className="trk-action__fix">
              {data.adoption
                ? `${data.adoption.arvo} Arvo component uses against ${data.adoption.legacy} legacy, across ${pr.filesChanged} files.`
                : `No UI components touched — ${pr.filesChanged} files changed.`}
            </p>
          </div>

          <PanelSections
            items={[
              data.arvo.length && {
                id: 'arvo',
                title: 'Arvo components used',
                icon: 'grid',
                badge: { message: String(countOf(pr.arvoUsed)) },
                content: (
                  <ul className="trk-list">
                    {data.arvo.map(([name, n]) => (
                      <li key={name}>
                        <span className="trk-rule-row">
                          <code className="trk-code">{name}</code>
                          <span className="trk-rule-row__title">{COMPONENT[name]?.group}</span>
                          <span className="trk-rule-row__count">{n}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              data.legacy.length && {
                id: 'legacy',
                title: 'Legacy controls still used',
                icon: 'history',
                badge: { message: String(countOf(pr.legacyUsed)), semanticType: 'warning' },
                content: (
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
                ),
              },
              pr.usedInternal && {
                id: 'internal',
                title: 'Internal component used directly',
                icon: 'exclamation-triangle',
                badge: { message: '1', semanticType: 'warning' },
                content: (
                  <p className="trk-prose">
                    Imported <code className="trk-code">{pr.usedInternal}</code>, which is not part
                    of the developer surface and changes without notice. Use{' '}
                    <code className="trk-code">{COMPONENT[pr.usedInternal]?.useInstead}</code>.
                  </p>
                ),
              },
              {
                id: 'who',
                title: 'Who and when',
                icon: 'users-alt',
                content: (
                  <DetailList>
                    <Field label="Author">
                      <button
                        type="button"
                        className="link-cell"
                        onClick={() => onOpenDeveloper?.(pr.author)}
                      >
                        {pr.author}
                      </button>
                    </Field>
                    <Field label="Team">{TEAM[pr.team]?.name}</Field>
                    <Field label="Product area">{pr.productArea}</Field>
                    <Field label="Files changed">{pr.filesChanged}</Field>
                    <Field label="Opened">{fmtDateTime(pr.openedAt)}</Field>
                    <Field label="Merged">{pr.mergedAt ? fmtDateTime(pr.mergedAt) : ''}</Field>
                  </DetailList>
                ),
              },
              data.violations.length && {
                id: 'findings',
                title: 'Findings',
                icon: 'exclamation-triangle',
                badge: {
                  message: `${data.open.length} open`,
                  semanticType: data.open.length ? 'warning' : 'positive',
                },
                content: (
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
                ),
              },
              data.pushes.length && {
                id: 'pushes',
                title: 'Pushes',
                icon: 'code',
                badge: { message: String(data.pushes.length) },
                content: (
                  <Timeline
                    items={data.pushes.map((pu, i) => ({
                      id: pu.id,
                      label: pu.commitId,
                      at: fmtDateTime(pu.timestamp),
                      text: pu.commitMessage,
                      tone: i === 0 ? 'info' : undefined,
                    }))}
                  />
                ),
              },
            ]}
          />

        </div>
      )}
    </DetailPanel>
  )
}
