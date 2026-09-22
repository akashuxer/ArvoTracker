/**
 * The field list every detail drawer uses.
 *
 * A real <dl>, so the pairing between a label and its value is in the markup
 * rather than only in the layout -- a screen reader announces "Owner, Mei
 * Tanaka" rather than two unrelated strings.
 *
 * An absent value renders the same em dash DataTable uses, so "we have no value"
 * reads identically wherever you meet it. `0` and `false` are values and pass
 * through.
 */
export function DetailList({ children, columns = 2 }) {
  return <dl className={`trk-dl trk-dl--${columns}`}>{children}</dl>
}

export function Field({ label, children, isWide = false }) {
  const isBlank =
    children === null ||
    children === undefined ||
    children === '' ||
    (Array.isArray(children) && children.length === 0)
  return (
    <div className={`trk-dl__row${isWide ? ' trk-dl__row--wide' : ''}`}>
      <dt className="trk-dl__key">{label}</dt>
      <dd className="trk-dl__val">
        {isBlank ? (
          <span className="data-table__blank" aria-label="No value">
            —
          </span>
        ) : (
          children
        )}
      </dd>
    </div>
  )
}

/** A link that is only a link when there is somewhere to go. */
export function MaybeLink({ href, children }) {
  if (!href) return null
  return (
    /* `link-cell` is the kit's link treatment -- colour, underline and offset.
       This only adds the outbound glyph, so a link looks the same here as in
       every other o9 app built on the kit. */
    <a className="link-cell trk-link--out" href={href} target="_blank" rel="noreferrer">
      {children}
      <span className="o9con o9con-globe trk-link__ico" aria-hidden="true" />
    </a>
  )
}

/** A section heading inside a drawer. */
export function DetailSection({ title, children }) {
  return (
    <section className="trk-section">
      <h3 className="trk-section__title">{title}</h3>
      {children}
    </section>
  )
}
