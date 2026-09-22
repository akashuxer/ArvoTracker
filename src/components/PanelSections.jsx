import { ArvoAccordion } from '@arvo/react'

/**
 * The secondary half of a read drawer.
 *
 * These panels had eight sections of equal weight, every one of them open, and
 * a paragraph of explanation on top of each. Everything was available and
 * nothing was findable -- you scrolled past the answer looking for it.
 *
 * So a drawer now has two parts: what you opened it for, always visible at the
 * top, and everything else in here. `single` expand mode, because these are
 * reference sections you dip into one at a time, and letting four stand open
 * rebuilds the wall this exists to remove.
 *
 * `transparent` rather than `surface`: the drawer is already a raised surface,
 * and a second one inside it reads as a box in a box.
 */
export default function PanelSections({ items, defaultOpen = null }) {
  const rows = items.filter(Boolean)
  if (!rows.length) return null
  return (
    <ArvoAccordion
      className="trk-sections"
      variant="transparent"
      size="sm"
      expandMode="single"
      isCollapsible
      defaultValue={defaultOpen}
      ariaLabel="More detail"
      items={rows.map((r) => ({
        value: r.id,
        title: r.title,
        icon: r.icon,
        badge: r.badge ?? null,
        panelPadding: 'sm',
        content: r.content,
      }))}
    />
  )
}
