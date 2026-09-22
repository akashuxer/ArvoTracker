import { ArvoEmptyState, ArvoButton, ArvoStatus } from '@arvo/react'
import { useNotifications, timeAgo } from './notifications'

/**
 * The bell's contents: runs that reached a terminal state while you were
 * elsewhere, newest first.
 *
 * Each row is a link to the screen that can do something about it -- a failed
 * run is only useful if you can get to its logs -- so the whole row is the
 * target, not a separate "view" affordance.
 */
export default function NotificationList({ onNavigate }) {
  const { items, unreadCount, markAllRead, markRead, clear } = useNotifications()

  if (!items.length) {
    return (
      <div className="notif-empty">
        <ArvoEmptyState
          size="sm"
          illustration="no-notifications"
          title="Nothing new"
          message="Runs and pipelines that finish while you are on another screen show up here."
        />
      </div>
    )
  }

  return (
    <div className="notif">
      <div className="notif__bar">
        <span className="notif__count">
          {unreadCount ? `${unreadCount} unread` : 'All caught up'}
        </span>
        <span className="notif__bar-actions">
          {unreadCount > 0 && (
            <ArvoButton variant="inline" size="sm" label="Mark all read" onClick={markAllRead} />
          )}
          <ArvoButton variant="inline" size="sm" label="Clear" onClick={clear} />
        </span>
      </div>

      <ul className="notif__list">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className={`notif__item${n.isRead ? '' : ' notif__item--unread'}`}
              onClick={() => {
                markRead(n.id)
                onNavigate?.(n.view)
              }}
            >
              {/* Arvo's own status mark, so the tone here matches the badge on
                  the row this notification points at. */}
              <ArvoStatus type={n.tone} size="sm" />
              <span className="notif__body">
                <span className="notif__title">
                  {n.title} {n.verb}
                </span>
                {n.detail && <span className="notif__detail">{n.detail}</span>}
                <span className="notif__time">{timeAgo(n.at)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
