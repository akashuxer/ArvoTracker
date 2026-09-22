import { useLayoutEffect, useRef, useState } from 'react'
import { ArvoIconButton } from '@arvo/react'

/**
 * The icon rail.
 *
 *   [ o9 ] [ Home ] | [ the open tool's screens ] | [ pinned tools ]
 *
 * On the hub no tool is open, so the middle group is empty and the rail stops
 * at Home plus whatever is pinned.
 */
export default function LeftNav({
  /* The destinations of the tool currently open. The shell has no idea what
     they are -- the host passes its manifest's rail. */
  items = [],
  /* The full tool catalogue, for resolving pinned ids to cards. */
  tools = [],
  activeId,
  onNavigate,
  onHome,
  showDestinations = true,
  pinnedIds = [],
  onOpenTool,
  isHidden = false,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const itemsRef = useRef(null)
  const [indicator, setIndicator] = useState(null)

  /* One block that slides between items rather than each item painting its own
     marker: a background cannot travel from one element to another, so the
     movement has to belong to a single node. Measured before paint, so it
     mounts already in place instead of sliding in from the top. */
  useLayoutEffect(() => {
    const list = itemsRef.current
    if (!list || !activeId) {
      setIndicator(null)
      return undefined
    }
    const measure = () => {
      const active = list.querySelector('.nav-item.selected, .nav-item[aria-pressed="true"]')
      if (!active) return setIndicator(null)
      const box = active.getBoundingClientRect()
      setIndicator({ y: box.top - list.getBoundingClientRect().top, h: box.height })
      return undefined
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [activeId, isCollapsed, showDestinations])

  const classes = ['left-nav', isCollapsed && 'left-nav--collapsed', isHidden && 'left-nav--hidden']
    .filter(Boolean)
    .join(' ')

  const pinned = pinnedIds
    .map((id) => tools.find((t) => t.id === id))
    .filter(Boolean)

  return (
    <nav className={classes} inert={isHidden || undefined} aria-label="Primary">
      {!isCollapsed && (
        <>
          {/* A white tile carrying the dark mark -- the logo reads as a logo
              against the near-black rail rather than as another rail icon. */}
          <span className="brand-mark o9con o9con-o9-logo" aria-hidden="true" />

          <ArvoIconButton
            icon="home"
            tooltip="QA-Utlity Hub"
            variant="primary"
            size="lg"
            onClick={onHome}
          />

          {showDestinations && (
            <>
              <div className="nav-divider" />
              {/* The open tool's own screens. */}
              <div className="nav-items" ref={itemsRef}>
                {indicator && (
                  /* Transform and height are set directly rather than through
                     custom properties: a transition whose value comes from a
                     changing var() does not resolve reliably. */
                  <span
                    className="nav-indicator"
                    aria-hidden="true"
                    style={{ height: `${indicator.h}px`, transform: `translateY(${indicator.y}px)` }}
                  />
                )}
                {items.map((item) => (
                <ArvoIconButton
                  key={item.id}
                  className="nav-item"
                  icon={item.icon}
                  tooltip={item.label}
                  variant="primary"
                  size="lg"
                  isSelected={activeId === item.id}
                  onClick={() => onNavigate(item)}
                />
                ))}
              </div>
            </>
          )}

          {pinned.length > 0 && (
            <>
              <div className="nav-divider" />
              {/* Pinned tools take the rail's own icon treatment. The tile
                  tint belongs on the hub card, where it distinguishes one tool
                  from another; on the rail it would compete with the active
                  state, which is what the rail actually has to communicate. */}
              {pinned.map((tool) => (
                <ArvoIconButton
                  key={tool.id}
                  className="nav-pin"
                  icon={tool.icon}
                  tooltip={tool.name}
                  variant="primary"
                  size="lg"
                  onClick={() => onOpenTool?.(tool.id)}
                />
              ))}
            </>
          )}
        </>
      )}

      <div className="nav-spacer" />

      {/* One control both ways -- CSS rotates the chevron when collapsed. */}
      <ArvoIconButton
        className="nav-toggle"
        icon="chevron-left"
        tooltip={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        variant={isCollapsed ? 'secondary' : 'primary'}
        size={isCollapsed ? 'sm' : 'lg'}
        onClick={() => setIsCollapsed((c) => !c)}
      />
    </nav>
  )
}
