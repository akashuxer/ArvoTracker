import { useCallback, useId, useRef } from 'react'

/**
 * Reveals one ArvoContextMenu panel while it is open, and reports the pick.
 *
 * Two bugs in Arvo 3.1.2, both verified against the shipped build:
 *
 *  1. `.arvo-context-menu` is `display: none` and revealed by an `.open`
 *     class -- and the component never adds it. Its className is the literal
 *     string "arvo-context-menu", so the menu mounts, positions and tears down
 *     entirely invisibly.
 *  2. Neither `onSelect` on the menu nor `onSelect` on an item is called. The
 *     row activates, the menu closes, and no callback runs.
 *
 * So visibility is forced with a class of this menu's own -- not a global one,
 * which would reveal every panel on the page at once -- and the pick is read
 * back out of the DOM. The panel is portaled and is not in the document on the
 * frame the open is reported, hence the one-frame wait.
 *
 * Delete all of this once ContextMenu sets `.open` and calls `onSelect`.
 */
export default function useContextMenuOpen(onPick) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const className = `ctx-${id}`
  const pickRef = useRef(onPick)
  pickRef.current = onPick

  const onOpenChange = useCallback(
    (isOpen) => {
      const apply = () => {
        const panel = document.querySelector(`.arvo-context-menu.${className}`)
        if (!panel) return
        panel.classList.toggle('is-open', isOpen)

        if (!isOpen || panel.dataset.pickBound) return
        panel.dataset.pickBound = '1'
        panel.addEventListener('click', (event) => {
          const row = event.target.closest?.('[role="menuitem"]')
          if (!row || !panel.contains(row)) return
          const rows = [...panel.querySelectorAll('[role="menuitem"]')]
          pickRef.current?.(rows.indexOf(row), row.innerText.trim())
        })
      }
      if (isOpen) requestAnimationFrame(apply)
      else apply()
    },
    [className]
  )

  return { className, onOpenChange }
}
