import { useMemo } from 'react'
import { Chart } from '@o9qa/kit'
import { ArvoVisualPalette } from '@o9qa/kit'
import DetailPanel from './DetailPanel'
import PanelSections from './PanelSections'
import { AdoptionBar, SeverityMark, fmtDate, timeAgo } from './marks'
import { TEAM, adoptionOf } from '../data/mock'
import { PUBLIC_COMPONENTS } from '../data/catalog'
import { RULE } from '../data/rules'
import { SETTLED_VIOLATION_STATUSES } from '../data/enums'
import { bucketBy, formatMovement, movement } from '../lib/series'
import { useTracker } from '../data/store'

/**
 * One developer, opened.
 *
 * This panel is the answer to "so what do I do about it". A row in a table can
 * say someone is at 34%; only this can say that they are at 34% and climbing,
 * that they have met nine of the thirty-four components, that their open
 * findings are all one rule, and that the rule in question has a roadmap item
 * against it -- which means the useful next step is a five-minute conversation,
 * not a ticket.
 *
 * It is written to be readable WITH the person, not about them. Nothing here is
 * phrased as a score, and the unused-components list is framed as what is left
 * to meet rather than what they have failed to use.
 */
const MONTHS = 12

export default function DeveloperDetail({ developer, isOpen, onClose }) {
  const { pullRequests, violations, workItems } = useTracker()

  const data = useMemo(() => {
    if (!developer) return null
    const mine = pullRequests.filter((p) => p.author === developer.name)
    const merged = mine.filter((p) => p.status === 'merged')
    const withUi = merged.map((p) => ({ p, a: adoptionOf(p) })).filter((r) => r.a)

    const arvo = withUi.reduce((n, r) => n + r.a.arvo, 0)
    const legacy = withUi.reduce((n, r) => n + r.a.legacy, 0)
    const pct = arvo + legacy ? Math.round((arvo / (arvo + legacy)) * 100) : null

    const series = bucketBy(withUi, 'month', (r) => r.p.mergedAt, (rows) => {
      if (!rows.length) return null
      const a = rows.reduce((n, r) => n + r.a.arvo, 0)
      const l = rows.reduce((n, r) => n + r.a.legacy, 0)
      return a + l ? Math.round((a / (a + l)) * 100) : null
    })
    /* A month with no merged PR carries the previous value forward. Drawing it
       as 0% would show a holiday as a collapse. */
    let carried = null
    const filled = series.values.map((v) => (v === null ? carried : (carried = v)))

    const uses = {}
    merged.forEach((p) => Object.entries(p.arvoUsed).forEach(([k, n]) => { uses[k] = (uses[k] ?? 0) + n }))
    const used = new Set(Object.keys(uses))
    const top = Object.entries(uses).sort((a, b) => b[1] - a[1])

    const legacyUses = {}
    merged.forEach((p) => Object.entries(p.legacyUsed).forEach(([k, n]) => { legacyUses[k] = (legacyUses[k] ?? 0) + n }))

    const mineViolations = violations.filter((v) => v.author === developer.name)
    const open = mineViolations.filter((v) => !SETTLED_VIOLATION_STATUSES.has(v.status))

    /* Grouped by rule, because that is the shape help takes. Eleven findings
       across one rule is one explanation; eleven across nine rules is a
       different conversation entirely. */
    const byRule = new Map()
    open.forEach((v) => byRule.set(v.ruleId, (byRule.get(v.ruleId) ?? 0) + 1))
    const rules = [...byRule.entries()].sort((a, b) => b[1] - a[1])

    /* Roadmap items that name the rules this person keeps hitting. If one
       exists, the finding is not really theirs to fix. */
    const blockedByArvo = workItems.filter((w) =>
      rules.some(([ruleId]) =>
        [w.title, w.problem, ...(w.notes ?? []).map((n) => n.text)].join(' ').includes(ruleId)
      )
    )

    return {
      mine, merged, withUi, arvo, legacy, pct,
      spark: filled,
      labels: series.labels,
      move: movement({ values: filled.filter((v) => v !== null) }, { higherIsBetter: true }),
      top,
      used,
      legacyTop: Object.entries(legacyUses).sort((a, b) => b[1] - a[1]),
      notMet: PUBLIC_COMPONENTS.filter((c) => !used.has(c.name)),
      violations: mineViolations,
      open,
      rules,
      blockedByArvo,
      internal: merged.filter((p) => p.usedInternal),
      lastPr: merged[0]?.mergedAt ?? '',
    }
  }, [developer, pullRequests, violations, workItems])

  const chart = useMemo(() => {
    if (!data) return null
    return {
      chart: { type: 'line', height: 220 },
      xAxis: { categories: data.labels, title: { text: null } },
      yAxis: { title: { text: 'Arvo share of UI uses' }, max: 100, min: 0, labels: { format: '{value}%' } },
      legend: { enabled: false },
      /* One line, one colour, and it is not a judgement colour -- this is a
         measurement over time, not a pass or a fail. */
      series: [{ name: 'Adoption', color: ArvoVisualPalette.blue.base, data: data.spark }],
    }
  }, [data])

  return (
    <DetailPanel
      title={developer ? developer.name : 'Developer'}
      icon="users-alt"
      size={620}
      isOpen={isOpen}
      onClose={onClose}
    >
      {developer && data && (
        <div className="trk-detail">
          <header className="trk-detail__head">
            <span className="trk-detail__eyebrow">
              {TEAM[developer.team]?.name} · {developer.repo}
            </span>
            <h2 className="trk-detail__title">{developer.name}</h2>
            {data.pct !== null && (
              <div className="trk-progress trk-progress--lg">
                <AdoptionBar arvo={data.arvo} legacy={data.legacy} />
                <span className="trk-progress__pct">{data.pct}%</span>
              </div>
            )}
          </header>

          <div className="trk-action">
            <p className="trk-action__where">
              <code>{data.merged.length} merged PRs</code>
              <span className={`trk-move trk-move--${data.move.favourability ?? 'flat'}`}>
                {data.move.change === 0 ? 'flat this month' : `${formatMovement(data.move, 'pp')} this month`}
              </span>
            </p>
            {chart && <Chart options={chart} />}
          </div>

          <PanelSections
            items={[
              data.top.length && {
                id: 'reaches',
                title: 'Reaches for most',
                icon: 'grid',
                badge: { message: `${data.top.length} of ${PUBLIC_COMPONENTS.length}` },
                content: (
                  <ul className="trk-list">
                    {data.top.slice(0, 10).map(([name, n]) => (
                      <li key={name}>
                        <span className="trk-rule-row">
                          <code className="trk-code">{name}</code>
                          <span className="trk-rule-row__count">{n}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              data.legacyTop.length && {
                id: 'legacy',
                title: 'Still on legacy controls',
                icon: 'history',
                badge: { message: String(data.legacyTop.length), semanticType: 'warning' },
                content: (
                  <ul className="trk-pills">
                    {data.legacyTop.map(([name, n]) => (
                      <li className="trk-pill trk-pill--legacy" key={name}>
                        {name} · {n}
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                id: 'notmet',
                title: 'Components not met yet',
                icon: 'question-circle',
                badge: { message: String(data.notMet.length) },
                content: (
                  <>
                    <p className="trk-prose trk-prose--quiet">
                      Useful for one thing: if something here would have saved work in a PR they
                      just wrote, that is a documentation problem.
                    </p>
                    <ul className="trk-pills">
                      {data.notMet.map((c) => (
                        <li className="trk-pill" key={c.name}>
                          {c.name.replace('Arvo', '')}
                        </li>
                      ))}
                    </ul>
                  </>
                ),
              },
              data.rules.length && {
                id: 'findings',
                title: 'Open findings by rule',
                icon: 'exclamation-triangle',
                badge: { message: String(data.open.length), semanticType: 'warning' },
                content: (
                  <ul className="trk-list">
                    {data.rules.map(([ruleId, n]) => (
                      <li key={ruleId}>
                        <span className="trk-rule-row">
                          <code className="trk-code">{ruleId}</code>
                          <SeverityMark severity={RULE[ruleId]?.severity} />
                          <span className="trk-rule-row__title">{RULE[ruleId]?.title}</span>
                          <span className="trk-rule-row__count">{n}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              data.blockedByArvo.length && {
                id: 'notmine',
                title: 'Not theirs to fix',
                icon: 'clipboard',
                badge: { message: String(data.blockedByArvo.length), semanticType: 'info' },
                content: (
                  <>
                    <p className="trk-prose trk-prose--quiet">
                      A rule they keep hitting has a roadmap item against it, so it is the design
                      system’s to answer.
                    </p>
                    <ul className="trk-list">
                      {data.blockedByArvo.map((w) => (
                        <li key={w.id}>
                          <span className="trk-rule-row">
                            <code className="trk-code">{w.id}</code>
                            <span className="trk-rule-row__title">{w.title}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ),
              },
              data.internal.length && {
                id: 'internal',
                title: 'Internal components used directly',
                icon: 'exclamation-triangle',
                badge: { message: String(data.internal.length), semanticType: 'warning' },
                content: (
                  <ul className="trk-list">
                    {data.internal.slice(0, 5).map((pu) => (
                      <li key={pu.id}>
                        <span className="trk-rule-row">
                          <code className="trk-code">{pu.id}</code>
                          <span className="trk-rule-row__title">
                            {pu.usedInternal} in {pu.title}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]}
          />

        </div>
      )}
    </DetailPanel>
  )
}
