import { ArvoPanel } from '@arvo/react'

/**
 * The frame every READ drawer shares.
 *
 * Non-modal, and that is the whole point. A modal panel puts a scrim over the
 * table it came from, so reading a second row meant close, find, open -- three
 * actions to answer "and what about that one?", which is the question people
 * actually have when they are scanning a list.
 *
 * `isModal={false}` drops the scrim and the focus trap; `closeOnOutsideClick`
 * is off so a click on the row behind swaps the panel's contents instead of
 * dismissing it. Both are documented ArvoPanel props, not a CSS override of the
 * component's internals.
 *
 * Escape still closes, and so does the close button. Losing the scrim should
 * not cost the two ways out that do not involve aiming at anything.
 *
 * FORMS do not use this. `WorkItemPanel` and `ImportScanPanel` stay modal on
 * purpose: a form is a task you finish or abandon, nothing behind it helps
 * while you are mid-edit, and a stray click that swapped the record under a
 * half-typed field would lose work. Reading is browsing; editing is not.
 */
export default function DetailPanel({ title, icon, isOpen, onClose, size = 560, children }) {
  return (
    <ArvoPanel
      displayMode="overlay"
      placement="right"
      title={title}
      icon={icon}
      defaultSize={size}
      isOpen={isOpen}
      isModal={false}
      closeOnOutsideClick={false}
      onClose={onClose}
    >
      {children}
    </ArvoPanel>
  )
}
