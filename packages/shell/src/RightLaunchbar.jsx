import { useLayoutEffect, useRef, useState } from 'react'
import { ArvoIconButton } from '@arvo/react'

/* The launchers, and the panel each one opens. Kept as-is from
 * spend-domain-analysis. */
export const PANELS = [
  { id: 'settings', icon: 'cog', label: 'Settings', title: 'User Settings' },
  { id: 'help', icon: 'question-circle', label: 'Help', title: 'Help' },
]

export default function RightLaunchbar({ isHidden = false, activePanel, onPanelChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const toolsRef = useRef(null)
  const [indicator, setIndicator] = useState(null)

  // Measured before paint so the block is in place on the frame it appears,
  // rather than jumping into position afterwards.
  useLayoutEffect(() => {
    const tools = toolsRef.current
    if (!tools || !activePanel) {
      setIndicator(null)
      return
    }
    const measure = () => {
      const active = tools.querySelector('.launchbar-tool--active')
      if (!active) return
      const box = active.getBoundingClientRect()
      setIndicator({ y: box.top - tools.getBoundingClientRect().top, h: box.height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(tools)
    return () => observer.disconnect()
  }, [activePanel, isCollapsed])

  const classes = [
    'right-launchbar',
    isCollapsed && 'right-launchbar--collapsed',
    isHidden && 'right-launchbar--hidden',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={classes} inert={isHidden || undefined} aria-label="Tools">
      {!isCollapsed && (
        <div className="launchbar-tools" ref={toolsRef}>
          {/* The active treatment is one block that slides between launchers: a
              button's own selected state cannot travel to another button. */}
          {indicator && (
            /* Set directly, not through custom properties: a transition
               whose value comes from a changing var() does not resolve
               reliably, so the block jumped instead of sliding. */
            <span
              className="launchbar-indicator"
              aria-hidden="true"
              style={{ height: `${indicator.h}px`, transform: `translateY(${indicator.y}px)` }}
            />
          )}

          {PANELS.map(({ id, icon, label }) => (
            <ArvoIconButton
              key={id}
              className={`launchbar-tool${activePanel === id ? ' launchbar-tool--active' : ''}`}
              icon={icon}
              tooltip={label}
              variant="tertiary"
              size="lg"
              aria-pressed={activePanel === id}
              onClick={() => onPanelChange(activePanel === id ? null : id)}
            />
          ))}
        </div>
      )}

      <div className="launchbar-spacer" />

      <ArvoIconButton
        className="launchbar-toggle"
        icon="chevron-right"
        tooltip={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        variant={isCollapsed ? 'secondary' : 'tertiary'}
        size={isCollapsed ? 'sm' : 'lg'}
        onClick={() => setIsCollapsed((c) => !c)}
      />
    </aside>
  )
}
