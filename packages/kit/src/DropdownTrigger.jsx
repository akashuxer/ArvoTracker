import { forwardRef } from 'react'

/**
 * A dropdown button that opens custom content instead of a menu.
 *
 * ArvoDropdownButton cannot do this: it is items-only. Its popover is built
 * from an `items` array and it dispatches `dd-btn:select`, so there is no slot
 * for a form. The caret it renders is `arvo-dd-btn__caret o9con o9con-angle-down`
 * and nothing else in Arvo produces that affordance -- ArvoButton's `icon` is
 * leading, not trailing.
 *
 * So this reproduces ArvoDropdownButton's exact markup and classes, and hands
 * the trigger to an ArvoPopover, which IS the component for custom content.
 * Nothing here is styled by hand: every class is Arvo's own, so the button
 * cannot drift from a real dropdown button.
 *
 * Replace this with ArvoDropdownButton the day it takes children.
 */
const DropdownTrigger = forwardRef(function DropdownTrigger(
  { label, icon, variant = 'secondary', size = 'md', isOpen = false, isDisabled = false, onClick },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      /* `open` is the class Arvo's own dropdown button sets while its menu is
         showing, and Arvo's CSS already hangs both behaviours off it:
         `.arvo-dd-btn.open .arvo-dd-btn__caret { transform: rotate(180deg) }`
         flips the caret, and `.arvo-btn--secondary...​.open` paints the
         pressed fill. Nothing is styled here -- the class is the whole fix. */
      className={`arvo-dd-btn arvo-btn arvo-btn--${variant} arvo-btn--${size}${isOpen ? ' open' : ''}`}
      aria-expanded={isOpen}
      disabled={isDisabled}
      onClick={onClick}
    >
      {icon && <span className={`arvo-dd-btn__icon o9con o9con-${icon}`} aria-hidden="true" />}
      <span className="arvo-dd-btn__lbl">{label}</span>
      <span className="arvo-dd-btn__caret o9con o9con-angle-down" aria-hidden="true" />
    </button>
  )
})

export default DropdownTrigger
