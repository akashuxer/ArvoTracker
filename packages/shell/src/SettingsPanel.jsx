import { ArvoRadio, ArvoRadioGroup } from '@arvo/react'
import { THEMES, SEPARATORS, useSettings } from './settings'

/**
 * How the app looks -- nothing about what it shows.
 *
 * Radio groups rather than dropdowns: every option set here is small, and a
 * dropdown hides the alternatives behind a click when the whole point of a
 * settings panel is to show what the choices are.
 *
 * Each change applies immediately. There is no Apply button because nothing
 * here is destructive or slow, and seeing the theme change as you pick it is
 * the fastest way to know whether you want it.
 */
function Section({ icon, title, description, children }) {
  return (
    <section className="pref">
      <h3 className="pref__title">
        <span className={`pref__ico o9con o9con-${icon}`} aria-hidden="true" />
        {title}
      </h3>
      {description && <p className="pref__desc">{description}</p>}
      <div className="pref__body">{children}</div>
    </section>
  )
}

export default function SettingsPanel() {
  const { theme, separators, set } = useSettings()

  return (
    <div className="prefs">
      <Section
        icon="paint-brush"
        title="Appearance"
        description="Applies everywhere, including dialogs, panels and charts' chrome."
      >
        {/* Tiles, not a radio list: a theme is a set of colours, and six of
            its own swatches say more than its name does. The radio is still
            there underneath for keyboard and screen-reader use -- the tile is
            its label. */}
        <ArvoRadioGroup
          name="theme"
          value={theme}
          onChange={({ value }) => set('theme', value)}
          className="theme-grid"
        >
          {THEMES.map((t) => (
            <ArvoRadio
              key={t.id}
              value={t.id}
              label={
                <span className="theme-tile">
                  <span className="theme-tile__ramp" aria-hidden="true">
                    {t.ramp.map((hex) => (
                      <span key={hex} style={{ background: hex }} />
                    ))}
                  </span>
                  <span className="theme-tile__name">
                    {t.label}
                    {t.hint && <span className="theme-tile__hint">{t.hint}</span>}
                  </span>
                </span>
              }
            />
          ))}
        </ArvoRadioGroup>
      </Section>

      <Section
        icon="table"
        title="Rows and columns"
        description="Rules between table rows and columns."
      >
        {/* Shown, not described. "Only rows" versus "Rows and columns" is a
            difference you can see in two seconds and would otherwise have to
            apply and undo to compare. */}
        <ArvoRadioGroup
          name="separators"
          value={separators}
          onChange={({ value }) => set('separators', value)}
          className="sep-grid"
        >
          {SEPARATORS.map((s) => (
            <ArvoRadio
              key={s.id}
              value={s.id}
              label={
                <span className="sep-option">
                  <span className={`sep-preview sep-preview--${s.id}`} aria-hidden="true">
                    {Array.from({ length: 9 }, (_, i) => (
                      <span key={i} />
                    ))}
                  </span>
                  <span className="sep-option__text">
                    <span className="sep-option__label">{s.label}</span>
                    {s.hint && <span className="sep-option__hint">{s.hint}</span>}
                  </span>
                </span>
              }
            />
          ))}
        </ArvoRadioGroup>
      </Section>

    </div>
  )
}
