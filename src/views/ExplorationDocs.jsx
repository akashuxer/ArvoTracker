import { ALERTS, SEVERITIES } from '../components/platformAlerts'
import './ExplorationDocs.css'

/**
 * README for ArvoBannerStackAlert -- written as a page, not a comment, because
 * the people who need it are designers and the Arvo team as much as developers.
 *
 * Everything under "Prototyped" describes behaviour that exists and was checked
 * in PlatformBanners.jsx. Everything under "Proposed" does not exist yet, and is
 * labelled so. Timings are the real ones: the stack reads them from the banner.
 */

const countOf = (severity) => ALERTS.filter((a) => a.severity === severity).length
const SEV_TOKENS = {
  error: ['--arvo-color-s-negative-subtle', '--arvo-color-b-negative'],
  warning: ['--arvo-color-s-warning-subtle', '--arvo-color-b-warning'],
  info: ['--arvo-color-s-info-subtle', '--arvo-color-b-info'],
  success: ['--arvo-color-s-positive-subtle', '--arvo-color-b-positive'],
}

function Section({ id, n, title, children }) {
  return (
    <section className="xd__section" id={id} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`}>
        <span className="xd__num">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Table({ head, rows, label }) {
  return (
    <div className="xd__table" role="region" aria-label={label} tabIndex={0}>
      <table>
        <thead>
          <tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={c === '✓' ? 'xd__yes' : undefined}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const Code = ({ children }) => (
  <pre><code>{children}</code></pre>
)

function Gap({ n, title, limitation, why, api, where }) {
  return (
    <article className="xd__gap">
      <header>
        <h4>{n}. {title}</h4>
        <span className="xd__tag">{where}</span>
      </header>
      <dl>
        <dt>Current limitation</dt><dd>{limitation}</dd>
        <dt>Why the stack needs it</dt><dd>{why}</dd>
        <dt>Recommended Arvo API</dt><dd>{api}</dd>
      </dl>
    </article>
  )
}

const CONTENTS = [
  ['what', 'What it is'],
  ['composition', 'Composition'],
  ['behaviour', 'Behaviour implemented'],
  ['dismiss', 'Dismiss [×]'],
  ['motion', 'Animation and motion'],
  ['gaps', 'Gaps in Arvo Banner'],
  ['compact', 'Compact support'],
  ['lifecycle', 'Lifecycle and timing (proposed)'],
  ['event-driven', 'Event-driven lifecycle'],
  ['dismissed-vs-expired', 'Dismissed vs expired'],
  ['session', 'Session behaviour'],
  ['state', 'State model'],
  ['example', 'Worked example: long-running batch'],
  ['api', 'Proposed API'],
  ['recommendation', 'Who owns what'],
]

export default function ExplorationDocs() {
  return (
    <article className="xd">
      <header className="xd__title">
        <h2>Arvo BannerStackAlert — Component Exploration</h2>
        <p className="xd__lede">
          A README for a component that does not exist yet. The working demo is the stack above the
          application header: {ALERTS.length} alerts, {SEVERITIES.length} severities, one sequence.
          This page records what was prototyped, what the base Arvo Banner would need so the stack
          can be composed from it, and what must stay with the platform’s notification service.
        </p>
        <div className="xd__note">
          <strong>Naming.</strong>
          <p>
            In code the base component is <code>ArvoBannerAlert</code> (<code>arvo-bnr-alert</code>).
            This page says “Arvo Banner” for it, and uses <code>ArvoBannerAlert</code> where a prop
            or class is quoted. Everything marked <em>Proposed</em> is a recommendation, not
            something that has been built or checked.
          </p>
        </div>
        <Table
          label="What is built and what is proposed"
          head={['Status', 'Covers']}
          rows={[
            ['Prototyped and working', 'Sections 1–7: the stack, Previous / Next, counter, per-alert ×, animation, compact use, and the gaps found while building it.'],
            ['Proposed, not built', 'Sections 8–14: showAfterMs, expiresAfterMs, lifecycle states, session dismissal and the API that would carry them.'],
          ]}
        />
        <nav aria-label="Contents">
          <ol className="xd__toc">
            {CONTENTS.map(([id, label]) => (
              <li key={id}><a href={`#${id}`}>{label}</a></li>
            ))}
          </ol>
        </nav>
      </header>

      {/* 1 ------------------------------------------------------------------ */}
      <Section id="what" n="1" title="What is Arvo BannerStackAlert?">
        <p>
          <strong>Arvo BannerStackAlert</strong> is a composed notification pattern for the moment
          several Arvo Banner notifications are live at the same time in one platform banner region.
          Today a product shows one banner and hides the rest behind a “1/10” pager, so a reader
          meets one problem at a time and never sees that a Warning sits behind the Error. The stack
          shows every severity at once, with the most important in front.
        </p>
        <p>
          It is an <strong>orchestration component</strong>. It renders <em>compact</em> Arvo
          Banners and adds the things a single banner cannot do: holding many notifications, ordering
          them by severity, moving between them, counting them, and animating the stack. It does not
          redraw the banner, and it does not own what a banner looks like.
        </p>
        <Code>{`Arvo BannerStackAlert
        ↓ composed from
Arvo Banner
        ↓
compact presentation used inside the stack`}</Code>
        <p>It manages:</p>
        <ul>
          <li>multiple alerts, and their severity groups</li>
          <li>the active alert, Previous / Next navigation and the counter</li>
          <li>stack ordering, dismissal and lifecycle</li>
          <li>the transition between alerts</li>
        </ul>
        <ul className="xd__sev" aria-label="Severities in the demo">
          {SEVERITIES.map((s) => (
            <li
              key={s.id}
              style={{ '--sev-bg': `var(${SEV_TOKENS[s.id][0]})`, '--sev-accent': `var(${SEV_TOKENS[s.id][1]})` }}
            >
              <strong>{s.label}</strong> · {countOf(s.id)} · <code>{s.type}</code>
            </li>
          ))}
        </ul>
      </Section>

      {/* 2 ------------------------------------------------------------------ */}
      <Section id="composition" n="2" title="Component composition">
        <Code>{`Arvo BannerStackAlert
│
├── Arvo Banner — Compact                     (one per live severity)
│   ├── Semantic icon
│   ├── Previous Icon Button   (xs, tertiary)
│   ├── Counter                (position / total)
│   ├── Next Icon Button       (xs, tertiary)
│   ├── Message
│   └── Dismiss Icon Button
│
├── Alert collection
├── Severity grouping
├── Active alert state
└── Stack navigation logic`}</Code>
        <div className="xd__cols">
          <div className="xd__col">
            <h4><span className="xd__tag xd__tag--arvo">Provided by Arvo Banner</span></h4>
            <ul>
              <li>Semantic type, colour and icon (<code>positive</code>, <code>info</code>, <code>warning</code>, <code>negative</code>)</li>
              <li>Compact presentation (<code>isCompact</code> — already exists)</li>
              <li>Message typography and inline content</li>
              <li>The dismiss button and its closing transition</li>
              <li>Live-region role: <code>alert</code> for negative, <code>status</code> otherwise</li>
              <li>Colour custom properties for theming</li>
            </ul>
          </div>
          <div className="xd__col">
            <h4><span className="xd__tag xd__tag--stack">Provided by Arvo BannerStackAlert</span></h4>
            <ul>
              <li>The alert collection and severity groups</li>
              <li>The active alert and Previous / Next</li>
              <li>The global counter</li>
              <li>Stack ordering, the thin edges, shadow and layering</li>
              <li>Holding the region’s height so the header does not move</li>
              <li>Per-alert dismissal and promotion of the next banner</li>
              <li>Stack animation, and reduced-motion handling for it</li>
            </ul>
          </div>
        <div className="xd__col">
          <h4><span className="xd__tag xd__tag--platform">Missing in Arvo Banner (compact)</span></h4>
          <ul>
            <li><strong>A Previous / counter / Next control</strong> before the message — the buttons, the “4/10” and their spacing</li>
            <li>A <strong>start-content slot</strong> to put it in</li>
            <li>A dismiss label that can say “Dismiss this notification”</li>
            <li>Controlled and programmatic dismissal, and an exit-complete event</li>
            <li>Closing timing as tokens, and lifecycle timing</li>
          </ul>
          <p className="xd__quiet">
            The control should <em>look and behave</em> as part of Arvo Banner. What it points at — the
            collection, the order, what “next” means — stays in BannerStackAlert.
          </p>
        </div>
      </div>
        <div className="xd__note xd__note--warn">
          <strong>What the prototype does that the component should not.</strong>
          <p>
            Previous, the counter and Next are real <code>ArvoIconButton</code>s, but Arvo Banner has
            nowhere to put them, so the prototype reaches into the banner’s message paragraph and
            places them there with a portal. It works and is accessible, but it depends on Arvo’s
            markup. Gap 1 below exists to remove it.
          </p>
        </div>
      </Section>

      {/* 3 ------------------------------------------------------------------ */}
      <Section id="behaviour" n="3" title="Behaviour implemented">
        <h4>Severity stack</h4>
        <p>
          Priority order, highest first: <strong>Error → Warning → Info → Success</strong>. The
          highest priority is in front, at the bottom of the stack and nearest the header. Lower
          priorities sit behind it as thin {`6px`} edges, the lowest at the top. Only the front
          banner’s text is ever readable; an edge shows colour and nothing else.
        </p>
        <Table
          label="Severity mapping"
          head={['Severity', 'Arvo type', 'Alerts in demo', 'Live-region role']}
          rows={SEVERITIES.map((s) => [
            s.label, s.type, String(countOf(s.id)), s.type === 'negative' ? 'alert' : 'status',
          ])}
        />

        <h4>Order inside a severity: newest first (LIFO)</h4>
        <p>
          <strong>Severity decides which banner is in front. Time decides the order within it.</strong>{' '}
          Inside a severity the alert that arrived last is <code>1</code> and the oldest is last, so
          Previous and Next walk newest to oldest. The newest is the one most likely to be about what
          the reader is doing now; an older alert that is still open has already had its chance to be
          seen. Alerts carry a <code>createdAt</code> timestamp and the stack sorts by it. Alerts with
          the same time keep the order they were given in.
        </p>
        <Code>{`Sort key:  1. severity   Error → Warning → Info → Success
           2. createdAt  newest first, within a severity

1/10  Error   · arrived 10:14   ← newest Error
2/10  Error   · arrived 10:09
3/10  Error   · arrived 10:02   ← oldest Error
4/10  Warning · arrived 10:12   ← newest Warning
…`}</Code>
        <p>
          The counter, Previous, Next and the stack all read the same sorted sequence, so they cannot
          disagree about the order.
        </p>
        <h4>When a new alert arrives</h4>
        <ul>
          <li>It goes to the <strong>top of its severity</strong> (position 1 of that severity) and the counter total goes up by one.</li>
          <li>
            <strong>It is shown.</strong> A new alert has to be seen, so the stack goes to it: that
            severity’s banner comes to the front with the new message, and the one the reader was on
            moves back by the same rule as Next. A new Warning while reading Error 1/10 reads
            <code> 5/11</code>, with the Warning banner in front.
          </li>
          <li>If its severity had no alerts left, that banner returns to the stack in its priority place, showing the new alert.</li>
          <li>The stack’s height is held, so the header does not move.</li>
          <li>Use <strong>New alert arrives</strong> on this page to see each case. Reset Alerts takes the demo back to the start.</li>
        </ul>
        <div className="xd__note xd__note--warn">
          <strong>A reader is moved without asking.</strong>
          <p>
            That is right for an Error and arguably wrong for a Success that arrives while someone is
            reading an Error. The prototype moves the reader for every severity. A rule such as “only
            move to a new alert if it is at least as severe as the one on screen” is a product choice
            and is not built.
          </p>
        </div>

        <h4>Previous / Next</h4>
        <p>
          Compact <code>xs</code> tertiary Arvo Icon Buttons sit before the message:
        </p>
        <Code>{`‹   4/10   ›   The o9 favourite service is not available…        ×`}</Code>
        <p>
          The counter is <strong>position in the whole sequence over the total of live alerts</strong>
          — <em>not</em> the position within a severity. Ten alerts, four of them errors: the last
          error reads <code>4/10</code>, and the first warning reads <code>5/10</code>. Previous is
          disabled at 1 and Next at the last alert. Neither wraps.
        </p>
        <ul>
          <li>
            <strong>Within a severity</strong> only the message and the counter change. The stack
            does not move.
          </li>
          <li>
            <strong>Crossing into another severity</strong> brings that severity’s banner to the
            front and moves the one just left to the end of the stack.
          </li>
        </ul>
        <Code>{`Before                      Next from 4/10 (last Error) → 5/10 (first Warning)
Error      ← in front       Warning    ← in front
Warning                     Info
Info                        Success
Success                     Error      ← sent to the back`}</Code>
        <p>
          <strong>Previous is the exact reverse.</strong> The stack is modelled as a dial turned to
          the active severity, not as “move the old one to the end”. That is what makes Previous undo
          Next: going from 4/10 forward to 5/10 and back to 4/10 returns the stack you started with.
          With the simpler rule the second trip would leave a different order.
        </p>

        <h4>Held height</h4>
        <p>
          The region’s height is measured once, with every banner present, as the tallest banner plus
          the edges behind it. It is then held. Rotating to a banner with a longer message, or
          dismissing alerts, does not change it, so <strong>the application header never moves until
          the last banner is dismissed</strong>. It is re-measured only when the width changes,
          because that is what changes how much a message wraps.
        </p>
        <h4>Where freed space goes</h4>
        <p>
          When a banner leaves, the one coming forward grows into the room, so the last banner left
          fills the whole held height. The extra is painted around the banner in the banner’s own
          Arvo colours (<code>--arvo-color-s-{'{type}'}-subtle</code> and <code>--arvo-color-b-{'{type}'}</code>).
          The banner itself is never resized, and a development-only check compares the painted
          surface with the real banner and warns if Arvo changes how it paints.
        </p>
        <h4>Elevation</h4>
        <p>
          Each banner casts a short upward shadow
          (<code>0 -2px 6px -1px var(--arvo-color-s-shadow-static-1)</code>) onto the edge behind it.
          It is deliberately subtle: the stack must not read as independent floating cards.
        </p>
        <h4>Accessibility</h4>
        <ul>
          <li>The region is a <code>section</code> labelled “Platform notifications, N alerts”.</li>
          <li>Banners behind the front one are <code>inert</code>: nothing the reader cannot see can be tabbed to.</li>
          <li>The visible counter is <code>aria-hidden</code>; screen readers hear “Alert 4 of 10”.</li>
          <li>The Previous / Next group is labelled “Alert navigation”.</li>
        </ul>
      </Section>

      {/* 4 ------------------------------------------------------------------ */}
      <Section id="dismiss" n="4" title="Dismiss [×]">
        <p>
          Clicking <code>×</code> dismisses <strong>only the notification currently shown</strong>, not
          its severity group. The next available alert takes its place and the counter is recalculated
          over what remains.
        </p>
        <Code>{`Before                       After dismissing Error B
1/10  Error A                1/9  Error A
2/10  Error B   ← current    2/9  Error C   ← now shown
3/10  Error C                3/9  Error D
4/10  Error D                4/9  Warning A
5/10  Warning A`}</Code>
        <ul>
          <li>
            <strong>The severity still has alerts.</strong> Its banner stays. The next alert in the
            sequence is shown; if the dismissed one was the last of the whole sequence, the previous
            one is.
          </li>
          <li>
            <strong>It was the last alert of its severity.</strong> That banner leaves the stack
            with Arvo’s own closing animation, and the next severity comes to the front.
          </li>
          <li>
            <strong>It was the last alert anywhere.</strong> The region collapses and the header
            moves up.
          </li>
        </ul>
        <Code>{`1/7  Error A   ← only Error        After:  1/6  Warning A   ← now in front
2/7  Warning A                             2/6  Info A
3/7  Info A                                …`}</Code>
        <p>
          The close button’s accessible name is <code>ariaLabel="Dismiss this notification"</code>.
          In the prototype it is set on Arvo’s button after render, because the banner exposes no prop
          for it (Gap 2); Arvo’s visible tooltip still says “Dismiss alert”.
        </p>
        <div className="xd__note xd__note--warn">
          <strong>× is not “Dismiss all Error notifications”.</strong>
          <p>
            That is a different, explicit action and, if it is ever needed, should be a separate
            control. The same button must never do both.
          </p>
        </div>
        <p>
          <strong>How the “banner stays” case works today.</strong> Arvo Banner closes itself whenever
          its button is clicked and cannot be told not to. So when a severity has alerts left, the
          stack mounts a fresh banner (a new React key) showing the next alert. The message swaps
          with no closing animation, which is the right result and the wrong mechanism — Gap 3.
        </p>
      </Section>

      {/* 5 ------------------------------------------------------------------ */}
      <Section id="motion" n="5" title="Animation and motion">
        <p>
          Every duration and easing below is <strong>read from Arvo Banner’s own closing
          transition</strong> at the moment it is needed (<code>getComputedStyle</code> on the banner),
          not copied, so the whole stack moves on the component’s clock and follows it if it changes.
          Arvo’s value today is <code>0.22s ease</code> (opacity, transform, max-height).
        </p>
        <Table
          label="Animations"
          head={['Animation', 'Trigger', 'Element', 'Type', 'Duration · easing', 'Direction', 'Belongs to']}
          rows={[
            ['Banner closing (existing)', '× on the last alert of a severity', 'The Arvo banner', 'opacity, transform, max-height transition, owned by Arvo', '0.22s · ease', 'Fades and collapses upward, then removes itself', 'Arvo Banner'],
            ['Closing slot', 'Same click', 'The stack’s wrapper for that severity', 'Web Animations: flex-basis → 0 and opacity 1 → 0, held until the banner unmounts', 'Banner’s · banner’s', 'Slot shrinks to nothing', 'BannerStackAlert'],
            ['Next banner takes the room', 'Same click', 'Wrapper of the banner coming forward', 'Web Animations: flex-basis from the edge height to all the room that is free', 'Banner’s · banner’s', 'Edge grows down to fill', 'BannerStackAlert'],
            ['Severity moves to the front', 'Previous / Next across a severity; × that reorders', 'Wrappers of every banner whose place changed', 'Web Animations (FLIP): flex-basis from the old size, plus translateY from the old position to 0, on one clock', 'Banner’s · banner’s', 'Front becomes an edge, the next comes forward; each edge moves one place', 'BannerStackAlert'],
            ['Quick second click', 'Another step while one runs', 'Same wrappers', 'Running animations are cancelled after reading where everything is now, so the next starts from there', 'Banner’s · banner’s', 'Continues, never jumps', 'BannerStackAlert'],
            ['Region collapses', 'The last banner is gone', 'The stack region', 'min-height transition from the held height to 0', '220ms (--arvo-duration-medium) · ease (--arvo-ease-simple)', 'Header moves up', 'BannerStackAlert'],
            ['Message changes inside a severity', 'Previous / Next, or × with alerts left', 'Message text', 'None — immediate', '—', '—', 'See below'],
            ['Counter changes', 'Any step or dismissal', 'Counter text', 'None — immediate', '—', '—', 'See below'],
            ['Banner appearing', 'Page opens, or Restore', 'Whole stack', 'None — mounted in place', '—', '—', 'See below'],
          ]}
        />
        <h4>Which should become part of Arvo, and which stay in the stack</h4>
        <ul>
          <li>
            <strong>Into Arvo Banner:</strong> exposing the closing duration and easing as tokens or
            custom properties (today they can only be read from computed style), and an
            <code>onExited</code> callback when the banner has finished leaving (today the stack
            watches the DOM for it).
          </li>
          <li>
            <strong>Stay in BannerStackAlert:</strong> the slot animations, the front-to-edge and
            edge-to-front reordering, and the region collapse. They are about layout between banners,
            which the base banner knows nothing of.
          </li>
          <li>
            <strong>Not prototyped, worth deciding:</strong> a short cross-fade of the message and
            counter, and an entrance animation. They are immediate today. If added, they belong in
            the stack and must be skipped under reduced motion.
          </li>
        </ul>
        <h4>Reduced motion</h4>
        <p>
          Under <code>prefers-reduced-motion: reduce</code> the stack plays <strong>none</strong> of its
          animations and the region collapse is instant. Arvo Banner already skips its own closing
          transition. State still changes clearly: the new banner is in front at once, the counter and
          message update, and the header moves. Movement is removed; information is not.
        </p>
      </Section>

      {/* 6 ------------------------------------------------------------------ */}
      <Section id="gaps" n="6" title="Gaps Identified in Arvo Banner">
        <p>
          Everything the prototype had to build <em>outside</em> the current Arvo Banner API. Each one
          lists what is missing, why the stack needs it, the API recommended and where it belongs: in
          Figma, in code, or in both.
        </p>
        <div className="xd__gaps">
          <Gap n="1" title="Pager control and start-content slot (Previous / counter / Next)" where="Figma + code"
            limitation="The compact banner has nothing before its message: message takes inline text, bold, links and code only, and children are ignored. There is no Previous, no counter, no Next. The prototype portals real Icon Buttons into Arvo’s message paragraph, which depends on its markup and breaks if React rewrites the paragraph."
            why="Moving through several notifications is a banner interaction, and it has to look and sound like part of the banner: same spacing, same xs tertiary buttons, same focus order, same screen-reader wording. It should come from Arvo Banner, not be assembled beside it."
            api={<>Two layers. <strong>(a)</strong> A first-class pager on the compact banner: <code>pager?: &#123; current: number; total: number; onPrevious(): void; onNext(): void; hasPrevious?: boolean; hasNext?: boolean &#125;</code>, drawing Previous, “current/total” and Next before the message, with Arvo’s own labels (“Previous”, “Next”, “Alert 4 of 10”). <strong>(b)</strong> A general <code>startContent?: ReactNode</code> slot for anything else. In Figma: a “Pager” property and a “Start content” slot on the compact Banner. The banner draws and announces the control; BannerStackAlert decides what <em>current</em>, <em>total</em> and <em>next</em> mean.</>} />
          <Gap n="2" title="Dismiss-button label" where="Code"
            limitation="The close button is fixed as “Dismiss alert”, tooltip and name."
            why="In a stack × dismisses one notification of many; the label must say so: “Dismiss this notification”."
            api={<><code>dismissLabel?: string</code>, default “Dismiss alert”. Drives both the accessible name and the tooltip.</>} />
          <Gap n="3" title="Controlled dismissal" where="Code"
            limitation="Clicking × always closes the banner, then calls onDismiss. The consumer cannot keep it open."
            why="With alerts left in the severity the banner must stay and show the next one. The prototype remounts it with a new key, which skips the animation and discards state."
            api={<><code>isOpen?: boolean</code> (controlled), or <code>onDismissRequest(): boolean | void</code> where false keeps it open. <code>onDismiss</code> stays as the “it happened” event.</>} />
          <Gap n="4" title="Programmatic dismissal" where="Code"
            limitation="A banner can only be closed by its own button."
            why="A platform event (batch finished, session ended) must be able to close a banner without a click."
            api={<><code>ref.dismiss()</code> in React and <code>dismiss()</code> in JS, playing the same closing transition. Setting <code>isOpen=false</code> does the same when controlled.</>} />
          <Gap n="5" title="Exit-complete event" where="Code"
            limitation="No signal when the banner has finished leaving. The stack watches the DOM for its removal."
            why="The slot animations must end exactly when the banner is gone, and layout settle after."
            api={<><code>onExited?: () =&gt; void</code>, fired after the closing transition (immediately when motion is reduced).</>} />
          <Gap n="6" title="Animation hooks and timing tokens" where="Figma + code"
            limitation="The closing duration and easing are internal; they can only be read back from computed style."
            why="Everything the stack animates should run on the banner’s clock."
            api={<>Document the motion as tokens (<code>--arvo-bnr-alert-duration</code>, <code>--arvo-bnr-alert-easing</code>) and in Figma motion specs. Stack-specific motion stays out of Arvo Banner.</>} />
          <Gap n="7" title="Updating an existing banner" where="Code"
            limitation="Changing message or type is allowed by props, but there is no defined behaviour for an in-place update: no transition, and no announcement guarantee."
            why="Within a severity the message changes in place. A batch banner goes from “in progress” to “completed”, changing type as well."
            api={<>Define in-place update as supported: stable identity across <code>message</code> and <code>type</code> changes, an optional <code>transition</code> for the swap, and a live-region announcement (Gap 8).</>} />
          <Gap n="8" title="Live-region behaviour on update" where="Code + docs"
            limitation="role is alert (negative) or status; updating the message is not documented to be announced, and an off-screen stacked banner cannot be left in the live region."
            why="The front banner changes as the reader steps; only what is shown should be announced, once, and not every edge."
            api={<><code>politeness?: &apos;polite&apos; | &apos;assertive&apos; | &apos;off&apos;</code> overriding the role’s default, and documented behaviour for message updates. Stacks mark non-front banners <code>inert</code>.</>} />
          <Gap n="9" title="Visibility lifecycle" where="Code"
            limitation="A banner is either mounted or not. There is no scheduled, expired or completed state."
            why="Long-running operations need delayed appearance, completion and expiry (sections 8 to 12)."
            api={<><code>lifecycleState</code>, <code>showAfterMs</code>, <code>expiresAfterMs</code> and events — see Proposed API.</>} />
          <Gap n="10" title="Stretching to the room it is given" where="Code (optional)"
            limitation="A banner cannot fill a taller container; it stays its natural height."
            why="The last banner left fills the held height. The prototype paints the extra in the banner’s own tokens around it."
            api={<>Probably <strong>not</strong> Arvo’s: keep it in the stack. Raise only if other consumers need a banner that fills a given height; it would then be an <code>isFilled</code> option, not a restyle.</>} />
          <Gap n="11" title="Message must be an array" where="Docs"
            limitation="Passing a string makes React overwrite the paragraph’s text, removing anything placed in it."
            why="It only matters because of Gap 1; the slot removes the constraint."
            api="Fixed by Gap 1. Until then the stack always passes an array of inline nodes." />
        </div>
        <div className="xd__note">
          <strong>Deliberately not gaps.</strong>
          <p>
            Severity-group ordering, the <em>value</em> of the counter, what Next means, edges, shadow
            and stack management are BannerStackAlert’s. The control that draws them is Arvo Banner’s (Gap 1). Moving them into Arvo Banner would make a single
            banner carry behaviour only a stack needs.
          </p>
        </div>
      </Section>

      {/* 7 ------------------------------------------------------------------ */}
      <Section id="compact" n="7" title="Compact support in Arvo Banner">
        <p>
          <strong>It already exists.</strong> <code>ArvoBannerAlert</code> has <code>isCompact</code>
          (BEM modifier <code>arvo-bnr-alert--compact</code>), and the prototype uses it for every
          banner in the stack. It drops the title, the action button and the link, and keeps the
          type colours, the icon, the message typography, the dismiss button and the accessibility
          behaviour.
        </p>
        <p>
          <strong>Recommendation: keep <code>isCompact</code>.</strong> Arvo’s conventions are
          <code>is</code>/<code>has</code> booleans for states of this kind, and a
          <code>variant="default" | "compact"</code> would break them for no gain. No separate
          component is needed. What compact lacks is the start-content slot (Gap 1), not a different
          design. In Figma, compact should be a property of the Banner component, with the slot
          available on it, not a second component.
        </p>
        <Table
          label="Compact measurements"
          head={['Measure', 'Value', 'Note']}
          rows={[
            ['Compact banner with controls', '≈ 32 px', 'Single line on a wide screen; the Icon Buttons are xs'],
            ['Edge behind the front banner', '6 px', '--arvo-space-6; colour only'],
            ['Held region height', 'tallest banner + 3 edges', 'Measured, not hard-coded'],
          ]}
        />
      </Section>

      {/* 8 ------------------------------------------------------------------ */}
      <Section id="lifecycle" n="8" title="Banner lifecycle and visibility timing">
        <div className="xd__note xd__note--warn">
          <strong>Proposed, not prototyped.</strong>
          <p>
            Sections 8 to 13 describe what Arvo Banner should be able to do. The demo uses fixed
            sample alerts: nothing here is timed, and dismissal is held in memory for the visit and
            cleared on leaving the page.
          </p>
        </div>
        <p>
          Banners need to be driven by <strong>time</strong> and by <strong>events</strong>. Both
          timing options are in milliseconds, and the name says what each one measures.
        </p>
        <Table
          label="Timing options"
          head={['Name', 'Meaning', 'Example']}
          rows={[
            ['showAfterMs', 'Optional delay before the banner becomes visible, measured from when it is scheduled. Stops a very short operation flashing a banner.', 'Operation starts → wait 3 s → show'],
            ['expiresAfterMs', 'Optional time the banner stays valid once active. When it passes, the banner expires permanently.', 'Active → valid for 5 s → expired'],
            ['expiresAt', 'Absolute alternative to expiresAfterMs: a timestamp, so expiry survives a reload and a new session.', '2026-10-08T10:15:05Z'],
          ]}
        />
        <p>
          <code>expiresAt</code> is the form that makes cross-session behaviour possible:
          a relative duration restarts every time it is read, an absolute time does not.
        </p>
      </Section>

      <Section id="event-driven" n="9" title="Event-driven lifecycle">
        <p>
          Some banners are not about time. “Batch is running” should stay until the platform says
          <em> batch completed</em>. At that point it can either disappear permanently or be replaced by
          “Batch completed successfully” for a configured time, then go.
        </p>
        <Code>{`scheduled → active → completed → (removed)
                  ↘ expired    → (removed)`}</Code>
        <ul>
          <li><code>scheduled</code> — created, waiting out <code>showAfterMs</code>. Not visible.</li>
          <li><code>active</code> — visible and valid.</li>
          <li><code>completed</code> — the event it describes has finished. Permanent.</li>
          <li><code>expired</code> — its time ran out. Permanent.</li>
        </ul>
        <p>
          <strong>Do not require <code>expiresAfterMs</code> when an event controls completion.</strong>
          A banner with neither is simply active until something completes it or the user dismisses
          it for the session. Completing with a replacement message is an update to the same banner
          (Gap 7): same identity, new type and message, with its own <code>expiresAfterMs</code> for
          the confirmation.
        </p>
      </Section>

      {/* 10 ----------------------------------------------------------------- */}
      <Section id="dismissed-vs-expired" n="10" title="Important distinction: Dismissed vs Expired">
        <div className="xd__cols">
          <div className="xd__col">
            <h4><span className="xd__tag">Dismissed</span></h4>
            <p>The user clicked <code>×</code>.</p>
            <ul>
              <li>Hidden for the <strong>current session</strong>.</li>
              <li>Says nothing about the notification itself, which may still be true.</li>
              <li>Reversible: it can return in a later session.</li>
            </ul>
          </div>
          <div className="xd__col">
            <h4><span className="xd__tag">Expired / Completed</span></h4>
            <p>It reached its end, or the event it describes has finished.</p>
            <ul>
              <li>Permanent: it does not return in any session.</li>
              <li>Decided by time or by the platform, never by the user.</li>
              <li>Irreversible from the banner’s side.</li>
            </ul>
          </div>
        </div>
        <div className="xd__note xd__note--warn">
          <strong>One boolean cannot hold both.</strong>
          <p>
            An <code>isDismissed</code> that means “hidden for now” and “gone forever” at once will
            eventually hide a running batch for good, or bring back a finished one. They are separate
            fields (section 12).
          </p>
        </div>
      </Section>

      {/* 11 ----------------------------------------------------------------- */}
      <Section id="session" n="11" title="Session dismissal behaviour">
        <Code>{`Session 1
  Batch running → Banner appears → User dismisses × → hidden for the rest of Session 1

Session 2 — batch still running      → Banner appears again
Session 2 — batch has completed      → Banner does not return
Session 2 — expiry has passed        → Banner does not return`}</Code>
        <Table
          label="Return rules"
          head={['At the start of a new session', 'Banner shown?']}
          rows={[
            ['Dismissed, event still active, not expired', 'Yes'],
            ['Dismissed, event completed', 'No'],
            ['Dismissed, expiry time passed', 'No'],
            ['Not dismissed, active', 'Yes'],
            ['Never reached its start delay', 'Not yet — scheduled'],
          ]}
        />
        <p>
          Arvo Banner can know only about the session it is rendered in, so it reports
          <code> onDismiss</code> and accepts <code>isSessionDismissed</code>. <strong>Remembering
          across sessions is the platform’s job</strong>, not the component’s (section 15).
        </p>
      </Section>

      {/* 12 ----------------------------------------------------------------- */}
      <Section id="state" n="12" title="State model">
        <Code>{`notStarted (scheduled)
      ↓
    active
      ↓
┌─────────────────┬────────────────────────┐
dismissed         completed / expired
(session only)    (permanent)
      ↓
may return in the next session
if still active and not expired`}</Code>
        <Code>{`lifecycleState = 'scheduled' | 'active' | 'completed' | 'expired'
isSessionDismissed: boolean        // separate, and only about this session`}</Code>
        <Table
          label="State transitions"
          head={['From', 'To', 'Caused by', 'Permanent?']}
          rows={[
            ['scheduled', 'active', 'showAfterMs elapsed', 'No'],
            ['active', 'completed', 'The platform reports the event finished', 'Yes'],
            ['active', 'expired', 'expiresAfterMs / expiresAt reached', 'Yes'],
            ['active', 'active + isSessionDismissed', 'User clicks ×', 'Session only'],
            ['isSessionDismissed', 'visible again', 'A new session while still active', '—'],
          ]}
        />
      </Section>

      {/* 13 ----------------------------------------------------------------- */}
      <Section id="example" n="13" title="Example: long-running batch">
        <ol className="xd__steps">
          {[
            ['10:00', 'Batch starts', 'Notification is scheduled with showAfterMs = 3000.'],
            ['10:00:03', 'Banner appears', '“Batch processing is in progress”'],
            ['10:02', 'User dismisses ×', 'Hidden for the rest of this session. Lifecycle is still active.'],
            ['10:10', 'New session, batch still running', 'Banner appears again: “Batch processing is in progress”'],
            ['10:15', 'Batch completes', 'Same banner updates, type positive: “Batch completed successfully”, for expiresAfterMs = 5000.'],
            ['10:15:05', 'Expiry', 'lifecycleState becomes expired and the notification is permanently removed. It never returns.'],
          ].map(([t, what, detail]) => (
            <li key={t}>
              <time>{t}</time>
              <div><strong>{what}</strong><span>{detail}</span></div>
            </li>
          ))}
        </ol>
      </Section>

      {/* API ---------------------------------------------------------------- */}
      <Section id="api" n="14" title="Proposed API">
        <h4>Arvo Banner additions</h4>
        <Code>{`<ArvoBannerAlert
  type="warning"
  isCompact
  message={[...]}
  startContent={<PreviousCounterNext />}      // Gap 1
  dismissLabel="Dismiss this notification"    // Gap 2
  isOpen={open}                               // Gaps 3, 4 (controlled)
  onDismissRequest={() => false}              // Gap 3
  onDismiss={…}  onExited={…}                 // Gap 5
  politeness="polite"                         // Gap 8
  lifecycleState="active"                     // Gap 9
  showAfterMs={3000}  expiresAfterMs={5000}  expiresAt="…"
  isSessionDismissed={false}
  onLifecycleChange={(state) => …}
/>`}</Code>
        <h4>Arvo BannerStackAlert</h4>
        <Code>{`<ArvoBannerStackAlert
  alerts={[{ id, severity, message, lifecycleState, expiresAt }]}
  severityOrder={['error', 'warning', 'info', 'success']}
  activeId={id}
  onActiveChange={(id) => …}      // Previous / Next, counter
  onDismiss={(alert) => …}        // one notification, never the group
  ariaLabel="Platform notifications"
/>`}</Code>
        <p>
          The stack renders compact banners only. It owns ordering, the counter, navigation, held
          height, edges, shadow and stack motion. It consumes lifecycle from the alerts it is given
          and never decides whether one has expired.
        </p>
      </Section>

      {/* Recommendation ------------------------------------------------------ */}
      <Section id="recommendation" n="15" title="Final recommendation">
        <p>
          The prototype shows the stack can be composed from Arvo Banner with very little outside it,
          provided the banner gains a start-content slot, a dismiss label, controlled and programmatic
          dismissal, an exit event and a lifecycle. Everything else is the stack’s or the platform’s.
        </p>
        <Table
          label="Responsibilities"
          head={['Capability', 'Arvo Banner', 'Arvo BannerStackAlert', 'Platform / Notification Service']}
          rows={[
            ['Semantic appearance', '✓', 'Uses Banner', ''],
            ['Compact presentation', '✓', 'Uses Banner', ''],
            ['Message', '✓', 'Uses Banner', ''],
            ['Dismiss button', '✓', 'Coordinates dismissal', ''],
            ['Timing', '✓', 'Consumes lifecycle', ''],
            ['Previous/Next', '', '✓', ''],
            ['Global counter', '', '✓', ''],
            ['Severity stack', '', '✓', ''],
            ['Stack animation', '', '✓', ''],
            ['Multiple notifications', '', '✓', ''],
            ['Session dismissal state', '', '', '✓'],
            ['Cross-session persistence', '', '', '✓'],
            ['Operation completion', '', '', '✓'],
            ['Authorization', '', '', '✓'],
            ['Scope', '', '', '✓'],
          ]}
        />
        <p className="xd__quiet">
          The page is not only a demo. It records what was prototyped, what belongs in Arvo Banner,
          what belongs in Arvo BannerStackAlert, and what must remain a responsibility of the
          platform’s notification service.
        </p>
      </Section>
    </article>
  )
}
