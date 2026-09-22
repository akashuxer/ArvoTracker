/**
 * A timeline.
 *
 * Arvo ships no Timeline component -- checked, not assumed -- so this is the
 * fourth step of the rules: write it yourself, once the kit, Arvo and the shell
 * have all been ruled out, and keep it in your own folder.
 *
 * It is built from Arvo tokens only, so it inherits the theme like everything
 * else. Semantically it is an ordered list, because that is what it is: events
 * in sequence. The rail and the dots are decoration on top of that and are
 * hidden from assistive technology, which reads the list.
 *
 * Newest first. A recurring finding's most recent sighting is the one being
 * acted on; a history that opens two years ago makes you scroll to reach the
 * only entry that is still true.
 */
export default function Timeline({ items }) {
  if (!items?.length) return null
  return (
    <ol className="trk-tl">
      {items.map((item, i) => (
        <li
          className={`trk-tl__row${item.tone ? ` trk-tl__row--${item.tone}` : ''}`}
          key={item.id ?? i}
        >
          <span className="trk-tl__mark" aria-hidden="true" />
          <div className="trk-tl__body">
            <div className="trk-tl__head">
              {item.label && <span className="trk-tl__label">{item.label}</span>}
              {item.badge}
            </div>
            {item.at && <span className="trk-tl__at">{item.at}</span>}
            {item.text && <p className="trk-tl__text">{item.text}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
