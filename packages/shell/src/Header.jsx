import { useLayoutEffect, useRef, useState } from 'react'
import { ArvoAvatar, ArvoBreadcrumb, ArvoIconButton, ArvoPopover } from '@arvo/react'
import NotificationList from './NotificationList'
import { useNotifications } from './notifications'

/* Who is signed in, and where. Tenant and avatar are one identity: the tenant
 * says whose data is on screen, the avatar whose account is reading it. */
const IDENTITY = {
  tenant: 'o9 Solutions',
  name: 'Performance QA',
  email: 'performance-qa@o9solutions.com',
}

/**
 * The application header. Spans the full width to the right of the rail; the
 * launchbar sits BELOW it.
 *
 * `tabs` are the sub-views OF THE CURRENT SCREEN, not the rail's destinations.
 * A screen with no sub-views passes none, and the tab strip disappears.
 */
export default function Header({
  title,
  tabs = [],
  activeTab,
  onTabChange,
  onBack,
  canGoBack = false,
  onNavigate,
  trail = [],
  onTrailNavigate,
  onOpenSettings,
}) {
  const bellRef = useRef(null)
  const { unreadCount } = useNotifications()
  const identityRef = useRef(null)
  const navRef = useRef(null)
  const [indicator, setIndicator] = useState(null)

  /* One shared block slides between tabs rather than each tab painting its own
     background: a background cannot travel from one element to another, so the
     movement has to belong to a single node. Measured before paint so it mounts
     already in place instead of sliding in from the left. */
  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav || !tabs.length) {
      setIndicator(null)
      return undefined
    }
    const measure = () => {
      const active = nav.querySelector('.tab-button.active')
      if (!active) return setIndicator(null)
      const navBox = nav.getBoundingClientRect()
      const box = active.getBoundingClientRect()
      setIndicator({ x: box.left - navBox.left, w: box.width })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [activeTab, tabs])

  return (
    <header className="app-header">
      <div className="header-context">
        <ArvoIconButton
          icon="arrow-left"
          tooltip="Back"
          variant="secondary"
          size="md"
          isDisabled={!canGoBack}
          onClick={onBack}
        />
        {/* Where you are, and what it is part of. The last step is the page
            itself, so it is not a link -- every step before it is. */}
        {trail.length > 1 ? (
          /* The click is caught on the way up rather than through
             `onNavigate`, which ArvoBreadcrumb does not call in 3.1.2 -- the
             anchor activates, the href is followed, and no callback runs.
             Arvo renders each crumb as `<a class="arvo-bc__lnk" title="...">`,
             so the title maps the anchor back to the step it came from. */
          <div
            className="header-trail"
            onClick={(event) => {
              const link = event.target.closest?.('.arvo-bc__lnk')
              if (!link) return
              event.preventDefault()
              const step = trail.find((t) => t.label === link.getAttribute('title'))
              if (step) onTrailNavigate?.(step.id)
            }}
          >
            <ArvoBreadcrumb
              size="sm"
              ariaLabel="Location"
              items={trail.map((t) => ({
                id: t.id,
                label: t.label,
                isCurrent: t.isCurrent,
                href: t.isCurrent ? undefined : '#',
              }))}
            />
          </div>
        ) : (
          <span className="workspace-name">{title}</span>
        )}
      </div>

      {tabs.length > 0 && (
        <nav className="view-tabs" ref={navRef} aria-label="Views">
          {indicator && (
            /* Width and transform are set directly, not through custom
               properties: a `transition: width` whose value comes from a
               changing var() does not resolve reliably. */
            <span
              className="tab-indicator"
              aria-hidden="true"
              style={{ width: `${indicator.w}px`, transform: `translateX(${indicator.x}px)` }}
            />
          )}
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`tab-button${activeTab === id ? ' active' : ''}`}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => onTabChange?.(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}

      <div className="header-spacer" />

      <div className="action-icons">
        <ArvoIconButton
          ref={bellRef}
          icon="bell-o"
          tooltip="Notifications"
          variant="tertiary"
          size="md"
          /* The count is a warning, not an error: something finished, and it
             may well have finished cleanly. */
          badge={unreadCount ? { count: unreadCount, semanticType: 'warning', isHiddenWhenZero: true } : null}
        />
        <ArvoPopover
          triggerRef={bellRef}
          title="Notifications"
          placement="bottom-end"
          width={360}
          hasFooter={false}
          variant="edge"
        >
          <NotificationList onNavigate={onNavigate} />
        </ArvoPopover>
      </div>

      <div className="user-context">
        <span className="tenant-name">{IDENTITY.tenant}</span>
        <button
          ref={identityRef}
          type="button"
          className="identity-button"
          aria-label={`${IDENTITY.name} — My Profile`}
        >
          <ArvoAvatar variant="initials" name={IDENTITY.name} size="md" />
        </button>
        <ArvoPopover
          triggerRef={identityRef}
          title="My Profile"
          placement="bottom-end"
          width={280}
          hasFooter={false}
        >
          <div className="profile-popover">
            <div className="profile-popover__head">
              <ArvoAvatar variant="initials" name={IDENTITY.name} size="lg" />
              <div>
                <p className="profile-popover__name">{IDENTITY.name}</p>
                <p className="profile-popover__email">{IDENTITY.email}</p>
              </div>
            </div>
            <ul className="profile-popover__menu">
              <li>
                {/* Preferences and the launchbar's Settings are the same
                    panel -- two doors, one room. */}
                <button type="button" onClick={() => onOpenSettings?.()}>
                  Preferences
                </button>
              </li>
              <li>
                <button type="button" className="is-danger">
                  Sign out
                </button>
              </li>
            </ul>
          </div>
        </ArvoPopover>
      </div>
    </header>
  )
}
