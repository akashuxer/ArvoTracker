import { ArvoButton, ArvoLoader } from '@arvo/react'

/**
 * A button that shows a loader while its action runs.
 *
 * ArvoButton's own `isLoading` is a SHIMMER, not a spinner: `.arvo-btn.loading`
 * sets `color: transparent`, hides the label and the icon, and sweeps a
 * gradient across the button. That reads as a skeleton -- as though the button
 * itself were still arriving -- rather than as work in progress, and it throws
 * away the one thing worth keeping on screen, which is what you just asked for.
 *
 * Arvo ships no spinner at all; `ArvoLoader` has `dot` and `square` variants
 * and nothing else, and ArvoButton renders no children, so the loader cannot
 * go inside it. This keeps the label, drops the icon, and lays Arvo's loader
 * over the space the icon left -- so the button neither changes width nor
 * loses its meaning. Every part is Arvo's; only the arrangement is local.
 */
export default function BusyButton({ isBusy = false, icon, label, isDisabled, ...rest }) {
  return (
    <span className={`busy-btn${isBusy ? ' busy-btn--on' : ''}`}>
      <ArvoButton
        {...rest}
        label={label}
        icon={isBusy ? undefined : icon}
        isDisabled={isBusy || isDisabled}
      />
      {isBusy && (
        <span className="busy-btn__loader" aria-hidden="true">
          <ArvoLoader variant="dot" size="sm" tone="theme" />
        </span>
      )}
    </span>
  )
}
