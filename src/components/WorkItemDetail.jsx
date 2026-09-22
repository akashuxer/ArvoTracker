import { ArvoButton } from '@arvo/react'
import DetailPanel from './DetailPanel'
import Timeline from './Timeline'
import { DetailList, DetailSection, Field, MaybeLink } from './DetailList'
import { PriorityBadge, StatusBadge, TypeMark, fmtDate, fmtDateTime, timeAgo } from './marks'
import { TEAM } from '../data/mock'
import { useTracker } from '../data/store'

/**
 * One work item, read.
 *
 * An overlay rather than a docked panel: reading an item is a thing you finish
 * and come back from, and the list behind it does not help while you are in it.
 * Editing is a separate panel, reached from here -- so a drawer you opened to
 * read cannot be left in a half-edited state.
 */
export default function WorkItemDetail({ item, isOpen, onClose, onEdit }) {
  const { areas } = useTracker()

  /* Which product areas are waiting on this item. Derived rather than stored on
     the item: the dependency is declared once, on the area, and a second copy
     here would be a second thing to keep true. */
  const blocking = item ? areas.filter((a) => a.dependencies.includes(item.id)) : []

  return (
    <DetailPanel
      title={item ? item.id : 'Work item'}
      icon="clipboard"
      size={520}
      isOpen={isOpen}
      onClose={onClose}
    >
      {item && (
        <div className="trk-detail">
          <header className="trk-detail__head">
            <h2 className="trk-detail__title">{item.title}</h2>
            <div className="trk-detail__marks">
              <TypeMark type={item.type} />
              <PriorityBadge priority={item.priority} />
              <StatusBadge status={item.status} />
            </div>
          </header>

          <DetailSection title="Problem statement">
            <p className="trk-prose">{item.problem}</p>
          </DetailSection>

          <DetailSection title="Classification">
            <DetailList>
              <Field label="Area">{item.area}</Field>
              <Field label="Component or pattern">{item.component}</Field>
              <Field label="Target release">{item.targetRelease}</Field>
              <Field label="Required by">{fmtDate(item.requiredBy)}</Field>
            </DetailList>
          </DetailSection>

          <DetailSection title="People">
            <DetailList>
              <Field label="Requested by">{item.requestedBy}</Field>
              <Field label="Requesting team">{TEAM[item.requestingTeam]?.name}</Field>
              <Field label="Owner">{item.owner}</Field>
              <Field label="Team contact">{TEAM[item.requestingTeam]?.contact}</Field>
            </DetailList>
          </DetailSection>

          <DetailSection title="Dates">
            <DetailList>
              <Field label="Created">{fmtDate(item.created)}</Field>
              <Field label="Last updated">{`${fmtDate(item.updated)} (${timeAgo(item.updated)})`}</Field>
            </DetailList>
          </DetailSection>

          <DetailSection title="Links">
            <DetailList columns={1}>
              <Field label="Figma">
                <MaybeLink href={item.figma}>Open the design file</MaybeLink>
              </Field>
              <Field label="Development ticket">
                <MaybeLink href={item.ticket}>Open the ticket</MaybeLink>
              </Field>
            </DetailList>
          </DetailSection>

          {blocking.length > 0 && (
            /* The reason the three sections are one app. An item is not just a
               row in a backlog -- it is the thing a migration is waiting on, and
               that is worth saying on the item itself. */
            <DetailSection title="Product areas waiting on this">
              <ul className="trk-list">
                {blocking.map((a) => (
                  <li key={a.id}>
                    <strong>{a.name}</strong> — {a.notes}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          <DetailSection title="Notes and decision history">
            {item.notes?.length ? (
              /* The same timeline the violation history uses. Decision history
                 is the archetypal case for it: events, in sequence, where when
                 something was decided is half the meaning. */
              <Timeline
                items={item.notes
                  .slice()
                  .reverse()
                  .map((n, i) => ({
                    id: `${n.at}-${i}`,
                    label: n.by,
                    at: fmtDateTime(n.at),
                    text: n.text,
                    tone: i === 0 ? 'info' : undefined,
                  }))}
              />
            ) : (
              <p className="trk-prose trk-prose--quiet">
                No decisions recorded yet. Anything worth explaining later — why this was deferred,
                what was ruled out — belongs here.
              </p>
            )}
          </DetailSection>

          <div className="form-actions">
            <ArvoButton variant="secondary" label="Close" onClick={onClose} />
            <ArvoButton variant="primary" label="Edit item" icon="pencil" onClick={() => onEdit(item)} />
          </div>
        </div>
      )}
    </DetailPanel>
  )
}
