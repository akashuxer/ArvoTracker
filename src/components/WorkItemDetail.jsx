import { ArvoButton } from '@arvo/react'
import DetailPanel from './DetailPanel'
import PanelSections from './PanelSections'
import Timeline from './Timeline'
import { DetailList, Field, MaybeLink } from './DetailList'
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
            <span className="trk-detail__eyebrow">{item.id}</span>
            <h2 className="trk-detail__title">{item.title}</h2>
            <div className="trk-detail__marks">
              <TypeMark type={item.type} />
              <PriorityBadge priority={item.priority} />
              <StatusBadge status={item.status} />
            </div>
          </header>

          <div className="trk-action">
            <p className="trk-action__fix">{item.problem}</p>
          </div>

          <PanelSections
            items={[
              {
                id: 'facts',
                title: 'Classification and ownership',
                icon: 'clipboard',
                content: (
                  <DetailList>
                    <Field label="Area">{item.area}</Field>
                    <Field label="Component">{item.component}</Field>
                    <Field label="Target release">{item.targetRelease}</Field>
                    <Field label="Required by">{fmtDate(item.requiredBy)}</Field>
                    <Field label="Requested by">{item.requestedBy}</Field>
                    <Field label="Requesting team">{TEAM[item.requestingTeam]?.name}</Field>
                    <Field label="Owner">{item.owner}</Field>
                    <Field label="Contact">{TEAM[item.requestingTeam]?.contact}</Field>
                    <Field label="Created">{fmtDate(item.created)}</Field>
                    <Field label="Updated">{timeAgo(item.updated)}</Field>
                  </DetailList>
                ),
              },
              (item.figma || item.ticket) && {
                id: 'links',
                title: 'Links',
                icon: 'globe',
                content: (
                  <DetailList columns={1}>
                    <Field label="Figma">
                      <MaybeLink href={item.figma}>Open the design file</MaybeLink>
                    </Field>
                    <Field label="Development ticket">
                      <MaybeLink href={item.ticket}>Open the ticket</MaybeLink>
                    </Field>
                  </DetailList>
                ),
              },
              blocking.length && {
                id: 'blocking',
                title: 'Areas waiting on this',
                icon: 'repeat',
                badge: { message: String(blocking.length), semanticType: 'warning' },
                content: (
                  <ul className="trk-list">
                    {blocking.map((a) => (
                      <li key={a.id}>
                        <span className="trk-rule-row">
                          <strong>{a.name}</strong>
                          <span className="trk-rule-row__title">{a.notes}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                id: 'history',
                title: 'Decision history',
                icon: 'history',
                badge: item.notes?.length ? { message: String(item.notes.length) } : null,
                content: item.notes?.length ? (
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
                    Nothing recorded yet. Anything worth explaining later belongs here.
                  </p>
                ),
              },
            ]}
          />

          <div className="form-actions">
            <ArvoButton variant="primary" label="Edit item" icon="pencil" onClick={() => onEdit(item)} />
          </div>
        </div>
      )}
    </DetailPanel>
  )
}
