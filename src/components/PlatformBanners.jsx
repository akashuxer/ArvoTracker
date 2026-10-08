import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react'
import { createPortal } from 'react-dom'
import { ArvoBannerAlert, ArvoIconButton } from '@arvo/react'
import {
  ALERTS, INITIAL_CURSOR, SEVERITIES, SEVERITY, afterDismiss, deriveStack, initialSeen,
} from './platformAlerts'
import './PlatformBanners.css'

/**
 * The platform banner stack -- every live alert at once, above the whole
 * application, with Previous / Next to move through them as one sequence.
 *
 * It lives in the SHELL, not in a page. A platform notification is about the
 * platform, not about the screen you happen to be on, so it has to sit above the
 * header and the rail rather than inside the content they frame.
 *
 * Arvo draws every banner. Type, icon, colour and spacing are the component's
 * own, and nothing here resizes or restyles it. What is added lives outside it:
 * the wrapper that clips and layers it, the shadow, the surface painted around it
 * when it has more room than it needs -- and, because ArvoBannerAlert has no slot
 * for anything before its message, the navigation controls, which are real
 * ArvoIconButtons placed into the message by `BannerNavigation`. That last one is
 * a gap in the component, not a choice: see the note there.
 */

/* The two Arvo tokens each banner type is painted with: its background and its
   left accent. The banner is never resized or restyled -- when the one in front
   has more room than it needs, the extra is painted with these, around it, so it
   reads as one taller banner. They are the tokens Arvo's own banner styles use
   for each type, so a theme change reaches them with no code here; and because
   nothing but that agreement keeps the two the same colour, PlatformBanners
   compares the painted result against the real banner in development and warns
   if Arvo ever changes it. */
const SURFACE = {
  negative: ['--arvo-color-s-negative-subtle', '--arvo-color-b-negative'],
  warning: ['--arvo-color-s-warning-subtle', '--arvo-color-b-warning'],
  info: ['--arvo-color-s-info-subtle', '--arvo-color-b-info'],
  positive: ['--arvo-color-s-positive-subtle', '--arvo-color-b-positive'],
}

/* ---- State ----------------------------------------------------------------- */

const BannerStackContext = createContext(null)

/* The state is held above the shell, not in the stack, because two things need
   it: the stack itself, and the Exploration page that offers to bring dismissed
   banners back. */
export function BannerStackProvider({ children }) {
  /* Which ALERTS have been dismissed. The close button removes the alert on
     show, not its severity: a banner goes away only when its last alert does. */
  const [dismissed, setDismissed] = useState([])
  /* ArvoBannerAlert closes itself whatever is asked of it, so a banner that has
     more alerts left is mounted again, as a new key, showing the next one. */
  const [bumps, setBumps] = useState({})
  /* Where the reader is in the sequence: one alert's id. */
  const [cursor, setCursor] = useState(INITIAL_CURSOR)
  /* The alert each severity's banner last showed. A banner that goes to the back
     keeps showing what it was showing, rather than snapping to something else
     while it is still visibly leaving. */
  const [seen, setSeen] = useState(initialSeen)
  /* ArvoBannerAlert removes itself when dismissed, so bringing one back means
     mounting it again: a new key. */
  const [epoch, setEpoch] = useState(0)

  const moveTo = useCallback((id) => {
    setCursor(id)
    setSeen((s) => ({ ...s, [ALERTS.find((a) => a.id === id).severity]: id }))
  }, [])

  const dismissAlert = useCallback(
    (id) => {
      const result = afterDismiss(id, dismissed, seen)
      setDismissed((d) => (d.includes(id) ? d : [...d, id]))
      setSeen(result.seen)
      if (result.target) setCursor(result.target.id)
      if (!result.emptied) {
        const sev = ALERTS.find((a) => a.id === id).severity
        setBumps((b) => ({ ...b, [sev]: (b[sev] ?? 0) + 1 }))
      }
      return result
    },
    [dismissed, seen]
  )

  const reset = useCallback(() => {
    setDismissed([])
    setBumps({})
    setCursor(INITIAL_CURSOR)
    setSeen(initialSeen())
  }, [])
  const restore = useCallback(() => {
    reset()
    setEpoch((n) => n + 1)
  }, [reset])

  const value = useMemo(
    () => ({ dismissed, bumps, cursor, seen, epoch, moveTo, dismissAlert, restore, reset }),
    [dismissed, bumps, cursor, seen, epoch, moveTo, dismissAlert, restore, reset]
  )
  return <BannerStackContext.Provider value={value}>{children}</BannerStackContext.Provider>
}

export function useBannerStack() {
  const ctx = useContext(BannerStackContext)
  if (!ctx) throw new Error('useBannerStack must be used inside <BannerStackProvider>')
  return ctx
}

/* ---- Measuring ------------------------------------------------------------- */

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* The banner's own height, not its wrapper's: the wrapper is clipped to an edge
   while the banner is behind, and the banner inside is not. */
const naturalOf = (item) => item?.querySelector('.arvo-bnr-alert')?.getBoundingClientRect().height ?? 0

/* A CSS length, as pixels -- so the edge height can stay a design token
   (--arvo-space-6) in the stylesheet and still be used in arithmetic here. */
function resolvePx(parent, cssValue) {
  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;visibility:hidden;height:${cssValue}`
  parent.appendChild(probe)
  const px = probe.getBoundingClientRect().height
  probe.remove()
  return px
}

/* How long, and with what easing, ArvoBannerAlert closes -- read from the banner
   itself rather than copied, so the stack follows the component if it ever
   changes. Everything the stack animates uses it, so the whole thing moves on one
   clock. */
function closingTiming(bannerEl) {
  const cs = getComputedStyle(bannerEl)
  const first = (list) => list.match(/^(cubic-bezier\([^)]*\)|steps\([^)]*\)|[a-z-]+)/)?.[0] ?? 'ease'
  return {
    duration: (parseFloat(cs.transitionDuration) || 0) * 1000,
    easing: first(cs.transitionTimingFunction),
  }
}

/* ---- Navigation, placed inside the message ------------------------------------ */

/**
 * `‹  3/10  ›` before the message, inside the message's own paragraph.
 *
 * NOTE FOR ARVO. ArvoBannerAlert has no slot for anything before its message: the
 * `message` prop takes text, bold, links and code, `children` is ignored, and the
 * only controls it draws are its own icon and close button. So these are real
 * ArvoIconButtons rendered by React into a small element this component puts at
 * the start of the banner's message paragraph. Arvo still draws the banner and
 * nothing about it is restyled -- but this does reach into its markup, and it
 * would not be necessary if the component took a leading slot. That is the thing
 * to ask for.
 *
 * The message is always passed as an array of inline nodes, never a string: React
 * updates a string child by overwriting the paragraph's text, which would remove
 * the element placed here. The guard below puts it back if anything else does.
 */
function BannerNavigation({ position, total, hasPrevious, hasNext, onPrevious, onNext, onMounted }) {
  const anchorRef = useRef(null)
  const [host, setHost] = useState(null)

  useLayoutEffect(() => {
    const message = anchorRef.current
      ?.closest('.trk-banners__body')
      ?.querySelector('.arvo-bnr-alert__msg')
    if (!message) return undefined

    const el = document.createElement('span')
    el.className = 'trk-banners__nav'
    el.setAttribute('role', 'group')
    el.setAttribute('aria-label', 'Alert navigation')
    message.prepend(el)
    setHost(el)

    /* Arvo names its close button "Dismiss alert" and takes no prop to change
       it. This one dismisses a single notification, and says so to assistive
       technology; the visible tooltip is Arvo's and stays as it is. */
    anchorRef.current
      .closest('.trk-banners__body')
      ?.querySelector('.arvo-bnr-alert__close')
      ?.setAttribute('aria-label', 'Dismiss this notification')

    const guard = new MutationObserver(() => {
      if (message.firstChild !== el) message.prepend(el)
    })
    guard.observe(message, { childList: true })
    return () => {
      guard.disconnect()
      el.remove()
      setHost(null)
    }
  }, [])

  /* The controls make the banner a little taller, so whatever measured the stack
     before they existed has to measure again. */
  useLayoutEffect(() => {
    if (host) onMounted?.()
  }, [host, onMounted])

  return (
    <>
      <span ref={anchorRef} hidden />
      {host &&
        createPortal(
          <>
            <ArvoIconButton
              variant="tertiary"
              size="xs"
              icon="angle-left"
              tooltip="Previous alert"
              isDisabled={!hasPrevious}
              onClick={onPrevious}
            />
            <span className="trk-banners__count">
              <span aria-hidden="true">
                {position}/{total}
              </span>
              <span className="sr-only">
                Alert {position} of {total}
              </span>
            </span>
            <ArvoIconButton
              variant="tertiary"
              size="xs"
              icon="angle-right"
              tooltip="Next alert"
              isDisabled={!hasNext}
              onClick={onNext}
            />
          </>,
          host
        )}
    </>
  )
}

/* ---- One banner ---------------------------------------------------------------- */

function PlatformBanner({
  severity, layer, bump, isDismissed, isActive, shown, position, total, hasPrevious, hasNext,
  itemRef, onStep, onDismiss, onNavMounted,
}) {
  const { type } = SEVERITY[severity]
  const [surface, accent] = SURFACE[type]

  /* A dismissed banner is still on screen for a moment, closing, and by then the
     sequence no longer contains it -- so its position would read 0 of 6. It keeps
     showing what it showed. */
  const last = useRef(null)
  if (!isDismissed) last.current = { shown, position, total }
  const view = isDismissed && last.current ? last.current : { shown, position, total }

  return (
    <div
      className="trk-banners__item"
      ref={itemRef}
      /* Dismissed, and possibly still closing. */
      data-dismissed={isDismissed || undefined}
      style={{
        /* The banner in front paints on top, whatever the DOM order: it is the
           one whose shadow has to fall onto the edge behind it. */
        '--trk-layer': layer,
        '--trk-fill-bg': `var(${surface})`,
        '--trk-fill-accent': `var(${accent})`,
      }}
      /* Only the banner in front can be read, so only it can be reached. The ones
         behind show an edge, and a control nobody can see must not be one they
         can tab to. */
      inert={!isActive || undefined}
    >
      <div className="trk-banners__body">
        <ArvoBannerAlert key={`banner-${bump}`} type={type} message={view.shown.message} isCompact onDismiss={onDismiss} />
        <BannerNavigation
          key={`nav-${bump}`}
          position={view.position}
          total={view.total}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onPrevious={() => onStep(-1)}
          onNext={() => onStep(1)}
          onMounted={onNavMounted}
        />
      </div>
    </div>
  )
}

/* ---- The stack ------------------------------------------------------------------- */

export default function PlatformBanners() {
  const { dismissed, bumps, cursor, seen, epoch, moveTo, dismissAlert, reset } = useBannerStack()
  const stackRef = useRef(null)
  const itemRefs = useRef({})
  /* Where each banner was, captured just before the order changes. */
  const pendingFlip = useRef(null)
  const running = useRef([])
  const [stackHeight, setStackHeight] = useState(0)
  const [navReady, setNavReady] = useState(0)
  const onNavMounted = useCallback(() => setNavReady((n) => n + 1), [])

  /* Leaving the page unmounts the stack, and the banners come back on return --
     so the record of what was dismissed, and where the reader was, has to go with
     them, or the page would offer to restore banners that are already showing. */
  useEffect(() => reset, [reset])

  const { liveAlerts, index, active, stack } = deriveStack(dismissed, cursor)
  const isFull = dismissed.length === 0
  const isEmpty = stack.length === 0
  const emptied = SEVERITIES.map((s) => s.id).filter((id) => !stack.includes(id))

  /* Dismissed banners stay rendered, at the front of the list, until they have
     finished closing: ArvoBannerAlert plays its own exit and removes itself, and
     that needs the element to still be there. */
  const renderOrder = [...emptied, ...stack]

  /* The stack's height with every banner present, from the tallest banner and the
     edges that would sit behind it, rather than from whatever happens to be
     showing -- so rotating to a banner with a longer message does not move the
     header. Measured, not written down, so it follows the real banner height.
     It is only worked out while the deck is full: once something is dismissed it
     must stay put, and it is only re-worked-out when the WIDTH changes, because
     that is what changes how much a message wraps. Moving between alerts changes
     the height of the stack too, and must not feed back into itself. */
  useLayoutEffect(() => {
    if (!isFull) return undefined
    const el = stackRef.current
    const measure = () => {
      const edge = resolvePx(el, 'var(--trk-banner-sliver)')
      const tallest = Math.max(...SEVERITIES.map((s) => naturalOf(itemRefs.current[s.id])))
      setStackHeight(tallest + (SEVERITIES.length - 1) * edge)
    }
    measure()
    let width = el.getBoundingClientRect().width
    const observer = new ResizeObserver(() => {
      const next = el.getBoundingClientRect().width
      if (Math.abs(next - width) < 0.5) return
      width = next
      measure()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [isFull, epoch, navReady])

  /* The surface painted around a banner has to be exactly the colour the banner
     is, or the seam shows. Nothing guarantees that but the two being read from
     the same tokens -- so if Arvo ever changes how it paints a banner, say so
     here, in development, rather than leaving a visible stripe to be found. */
  useLayoutEffect(() => {
    if (!import.meta.env.DEV) return
    SEVERITIES.forEach(({ id, type }) => {
      const item = itemRefs.current[id]
      const banner = item?.querySelector('.arvo-bnr-alert')
      if (!banner) return
      const a = getComputedStyle(banner)
      const w = getComputedStyle(item)
      const accent = w.boxShadow.match(/rgba?\([^)]*\)/)?.[0]
      if (a.backgroundColor !== w.backgroundColor || a.borderLeftColor !== accent) {
        console.warn(
          `[PlatformBanners] the surface around the "${type}" banner no longer matches the banner. ` +
            `Arvo has changed how it is painted; update SURFACE.`
        )
      }
    })
  }, [epoch])

  /* Hold the height from the moment there is anything to hold, so the header does
     not move while there is something to read. */
  const heldHeight = !isEmpty && stackHeight ? { '--trk-stack-h': `${stackHeight}px` } : undefined

  /* ---- Moving between alerts ---- */

  const geometry = () => {
    const top = stackRef.current.getBoundingClientRect().top
    return Object.fromEntries(
      stack.map((sev) => {
        const r = itemRefs.current[sev].getBoundingClientRect()
        return [sev, { top: r.top - top, h: r.height }]
      })
    )
  }

  const cancelRunning = () => {
    running.current.forEach((a) => a.cancel())
    running.current = []
  }

  const handleStep = (delta) => {
    const target = liveAlerts[index + delta]
    if (!target) return
    const crossing = target.severity !== active
    /* Within a severity the stack does not change at all: only the message and
       the counter, which is just a different alert being shown. */
    if (crossing && !reducedMotion()) {
      /* Where everything is RIGHT NOW -- mid-move if a previous step is still
         running -- so a quick second click carries on from where the first got
         to, instead of jumping. Then the old animations go, so what is measured
         once the order has changed is the settled layout. */
      pendingFlip.current = geometry()
      cancelRunning()
    }
    moveTo(target.id)
  }

  /* The order has changed: the banner now in front was an edge, the one that was
     in front is now an edge, and every edge has moved one place. Each is
     animated from where it WAS to where it is -- its size, and its position --
     so nothing teleports. Heights and positions are separate animations: a
     banner's slot grows or shrinks, and the flow then puts it somewhere other
     than where it was, so the difference is carried by a transform that eases
     away on the same clock. The total height never changes, so the header stays
     where it is. */
  const stackKey = stack.join('|')
  useLayoutEffect(() => {
    const from = pendingFlip.current
    pendingFlip.current = null
    if (!from) return

    const top = stackRef.current.getBoundingClientRect().top
    const settled = Object.fromEntries(
      stack.map((sev) => {
        const r = itemRefs.current[sev].getBoundingClientRect()
        return [sev, { top: r.top - top, h: r.height }]
      })
    )
    const timing = {
      ...closingTiming(itemRefs.current[stack[0]].querySelector('.arvo-bnr-alert')),
      fill: 'both',
    }

    /* Sizes first, held at the start, so that where each banner would sit with
       its OLD size can be measured. */
    const sizes = stack
      .filter((sev) => Math.abs(from[sev].h - settled[sev].h) > 0.01)
      .map((sev) => {
        const a = itemRefs.current[sev].animate(
          [{ flexBasis: `${from[sev].h}px` }, { flexBasis: `${settled[sev].h}px` }],
          timing
        )
        a.pause()
        a.currentTime = 0
        return a
      })

    const moves = stack.map((sev) => {
      const el = itemRefs.current[sev]
      const start = el.getBoundingClientRect().top - top
      return el.animate(
        [{ transform: `translateY(${from[sev].top - start}px)` }, { transform: 'translateY(0)' }],
        timing
      )
    })

    sizes.forEach((a) => a.play())
    running.current = [...sizes, ...moves]
    Promise.all(running.current.map((a) => a.finished))
      .then(() => cancelRunning())
      .catch(() => {})
  }, [stackKey]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Dismissing the banner in front ---- */

  /* ArvoBannerAlert closes itself -- it fades, slides and collapses over a fixed
     time -- and that is left entirely alone. The stack's height is held, so the
     space it gives up has to go somewhere: the banner coming forward grows into
     it, to fill whatever the edges behind it do not use. The two run on the
     component's own clock, so what one gives up the other takes, and the total
     does not change. Nothing about either banner is resized: only the slots they
     sit in. */
  const handleDismiss = (id) => {
    const severity = ALERTS.find((a) => a.id === id).severity
    const result = dismissAlert(id)
    const live = SEVERITIES.map((s) => s.id).filter((sev) =>
      result.remaining.some((a) => a.severity === sev)
    )
    const at = result.target ? live.indexOf(result.target.severity) : -1
    const nextStack = at < 0 ? [] : [...live.slice(at), ...live.slice(0, at)]
    const remaining = stack.filter((s) => s !== severity || !result.emptied)
    const next = nextStack[0]
    const sameOrder = nextStack.join('|') === remaining.join('|')

    /* The banner stays, showing the next alert (it was mounted again, so there
       is nothing to animate for it), or the order changes underneath it. */
    if (!result.emptied || !sameOrder) {
      if (!reducedMotion() && nextStack.join('|') !== stack.join('|')) {
        pendingFlip.current = geometry()
        cancelRunning()
      }
      if (!result.emptied) return
    }
    if (reducedMotion()) return

    const leaving = itemRefs.current[severity]
    const bannerEl = leaving?.querySelector('.arvo-bnr-alert')
    if (!leaving || !bannerEl) return
    /* `forwards` holds the end state until the closing banner has actually gone.
       Arvo removes it when ITS transition ends, a frame or so after this one
       would, and without this the slot would flicker back for that frame. */
    const opts = { ...closingTiming(bannerEl), fill: 'forwards' }

    const anims = [
      leaving.animate(
        [{ flexBasis: `${leaving.getBoundingClientRect().height}px` }, { flexBasis: '0px' }],
        opts
      ),
      leaving.animate([{ opacity: 1 }, { opacity: 0 }], opts),
    ]

    if (next && sameOrder) {
      const item = itemRefs.current[next]
      /* It is an edge now, so its current height IS the edge height. */
      const edge = item.getBoundingClientRect().height
      const slot = stackRef.current.getBoundingClientRect().height - (remaining.length - 1) * edge
      anims.push(
        item.animate(
          [{ flexBasis: `${edge}px` }, { flexBasis: `${Math.max(naturalOf(item), slot)}px` }],
          opts
        )
      )
    }

    /* Hand over to the stylesheet once the closing banner has unmounted: the
       settled layout produces exactly the sizes these animations end on. */
    const watcher = new MutationObserver(() => {
      if (leaving.querySelector('.arvo-bnr-alert')) return
      anims.forEach((a) => a.cancel())
      watcher.disconnect()
    })
    watcher.observe(leaving, { childList: true, subtree: true })
  }

  return (
    <section
      ref={stackRef}
      className={`trk-banners${isEmpty ? ' trk-banners--empty' : ''}`}
      style={heldHeight}
      aria-label={`Platform notifications, ${liveAlerts.length} alerts`}
    >
      {renderOrder.map((severity) => {
        const isDismissed = emptied.includes(severity)
        const shown = ALERTS.find((a) => a.id === seen[severity])
        const position = liveAlerts.findIndex((a) => a.id === shown.id) + 1
        const place = stack.indexOf(severity)
        return (
          <PlatformBanner
            key={`${severity}-${epoch}`}
            severity={severity}
            bump={bumps[severity] ?? 0}
            layer={isDismissed ? stack.length + 1 : stack.length - place}
            isDismissed={isDismissed}
            isActive={severity === active}
            shown={shown}
            position={position}
            total={liveAlerts.length}
            hasPrevious={index > 0}
            hasNext={index < liveAlerts.length - 1}
            itemRef={(el) => {
              itemRefs.current[severity] = el
            }}
            onStep={handleStep}
            onDismiss={() => handleDismiss(shown.id)}
            onNavMounted={onNavMounted}
          />
        )
      })}
    </section>
  )
}
