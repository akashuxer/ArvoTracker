import { useMemo } from 'react'
import { ArvoButton, ArvoPanel } from '@arvo/react'
import { Chart } from '@o9qa/kit'
import { ArvoVisualPalette } from '@o9qa/kit'
import { DetailList, DetailSection, Field } from './DetailList'
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
    <ArvoPanel
      displayMode="overlay"
      placement="right"
      title={developer ? developer.name : 'Developer'}
      defaultSize={620}
      isOpen={isOpen}
      onClose={onClose}
    >
      {developer && data && (
        <div className="trk-detail">
          <header className="trk-detail__head">
            <h2 className="trk-detail__title">{developer.name}</h2>
            <p className="trk-prose trk-prose--quiet">
              {TEAM[developer.team]?.name} · {developer.repo}
            </p>
            {data.pct !== null && (
              <div className="trk-progress trk-progress--lg">
                <AdoptionBar arvo={data.arvo} legacy={data.legacy} />
                <span className="trk-progress__pct">{data.pct}%</span>
              </div>
            )}
          </header>

          <DetailSection title="Adoption over the last year">
            {chart && <Chart options={chart} />}
            <DetailList>
              <Field label="This month vs last">
                <span className={`trk-move trk-move--${data.move.favourability ?? 'flat'}`}>
                  {data.move.change === 0 ? 'no change' : formatMovement(data.move, 'pp')}
                </span>
              </Field>
              <Field label="Merged PRs">{data.merged.length}</Field>
              <Field label="PRs that touched UI">{data.withUi.length}</Field>
              <Field label="Last merged">{data.lastPr ? `${fmtDate(data.lastPr)} (${timeAgo(data.lastPr)})` : ''}</Field>
            </DetailList>
          </DetailSection>

          <DetailSection title="Reaches for most">
            {data.top.length ? (
              <ul className="trk-list">
                {data.top.slice(0, 8).map(([name, n]) => (
                  <li key={name}>
                    <span className="trk-rule-row">
                      <code className="trk-code">{name}</code>
                      <span className="trk-rule-row__title">{n} uses</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="trk-prose trk-prose--quiet">No Arvo components in merged work yet.</p>
            )}
          </DetailSection>

          <DetailSection title="Still on legacy controls">
            {data.legacyTop.length ? (
              <>
                <p className="trk-prose trk-prose--quiet">
                  Each of these has an Arvo equivalent today. Most predate it, which is why they are
                  here — the Modernization board tracks the areas they live in.
                </p>
                <ul className="trk-pills">
                  {data.legacyTop.map(([name, n]) => (
                    <li className="trk-pill trk-pill--legacy" key={name}>
                      {name} · {n}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="trk-prose trk-prose--quiet">None — every UI control in their merged work is Arvo.</p>
            )}
          </DetailSection>

          <DetailSection title={`Components not met yet — ${data.notMet.length} of ${PUBLIC_COMPONENTS.length}`}>
            <p className="trk-prose trk-prose--quiet">
              Not a gap to close for its own sake. It is useful for one thing: if a component here
              would have saved work in a PR they just wrote, that is a documentation problem, not a
              person problem.
            </p>
            <ul className="trk-pills">
              {data.notMet.slice(0, 18).map((c) => (
                <li className="trk-pill" key={c.name}>
                  {c.name.replace('Arvo', '')}
                </li>
              ))}
              {data.notMet.length > 18 && <li className="trk-muted">+{data.notMet.length - 18} more</li>}
            </ul>
          </DetailSection>

          {data.internal.length > 0 && (
            <DetailSection title="Internal components used directly">
              <p className="trk-prose">
                {data.internal.length} PR{data.internal.length > 1 ? 's' : ''} imported an internal
                building block. These are exported so the public components can use them, but they
                are not part of the developer surface and they change without notice — worth a word,
                because nothing in the type system says so.
              </p>
              <ul className="trk-list">
                {data.internal.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <span className="trk-rule-row">
                      <code className="trk-code">{p.id}</code>
                      <span className="trk-rule-row__title">
                        {p.usedInternal} in {p.title}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          <DetailSection title="Open findings, grouped by rule">
            {data.rules.length ? (
              <>
                <p className="trk-prose trk-prose--quiet">
                  {data.open.length} open across {data.rules.length} rule
                  {data.rules.length > 1 ? 's' : ''}. Grouped, because that is the shape help takes —
                  eleven findings on one rule is one explanation.
                </p>
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
              </>
            ) : (
              <p className="trk-prose trk-prose--quiet">Nothing open.</p>
            )}
          </DetailSection>

          {data.blockedByArvo.length > 0 && (
            <DetailSection title="Not theirs to fix">
              <p className="trk-prose">
                A rule they keep hitting has a roadmap item against it. Until that ships, the
                finding is the design system's to answer, not this person's — and saying so is the
                single most useful thing this panel can do.
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
            </DetailSection>
          )}

          <div className="form-actions">
            <ArvoButton variant="secondary" label="Close" onClick={onClose} />
          </div>
        </div>
      )}
    </ArvoPanel>
  )
}
