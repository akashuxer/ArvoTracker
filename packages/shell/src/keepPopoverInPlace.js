/**
 * Workaround for an Arvo bug: a closing popover jumps to the top-left corner.
 *
 * ArvoPopover positions its panel with an inline `translate`, on an element
 * that is `position: absolute; top: 0; left: 0`. On close it REWRITES the
 * whole inline style to add `opacity: 0` and `pointer-events: none`, and the
 * `translate` is lost in that rewrite. With no translate the panel is back at
 * 0,0 -- so it teleports to the corner of the page and plays its 150ms fade
 * there. Measured on the profile popover: `translate: 728px 48px` while open,
 * absent on the very first exit frame.
 *
 * Restoring the last known translate keeps the exit animation Arvo intends
 * while removing the jump. Remove this once ArvoPopover preserves its own
 * position through the exit transition.
 */
const LAST = new WeakMap()

export default function keepPopoverInPlace() {
  const observer = new MutationObserver((records) => {
    for (const { target } of records) {
      if (!(target instanceof HTMLElement) || !target.classList.contains('arvo-popover')) continue

      const current = target.style.translate
      if (current) {
        LAST.set(target, current)
        continue
      }
      /* Translate gone but the panel is still on screen and mid-transition:
         this is the exit rewrite, not a fresh mount. Put it back. */
      const previous = LAST.get(target)
      if (previous && target.style.opacity === '0') target.style.translate = previous
    }
  })

  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['style'],
  })
  return () => observer.disconnect()
}
