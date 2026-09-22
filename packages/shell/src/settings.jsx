import { createContext, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Per-viewer display preferences.
 *
 * Both of these are Arvo's own machinery, not invention:
 *   - The themes are the `data-theme` variants Arvo already ships. Setting the
 *     attribute on <html> swaps every semantic colour token at once, so the
 *     whole app follows -- including Arvo's own components.
 *   - Column separators toggle a class the table CSS reads. Rows-only is the
 *     default because vertical rules add ink without adding information when
 *     the columns are already aligned.
 *
 * Stored in localStorage: a preference, per browser, that nothing else needs
 * to read. Every access is guarded -- it throws in a private window.
 */

const STORE_KEY = 'o9pu.settings.v1'

/* Arvo's theme names, with the labels this app shows for them.
 *
 * `ramp` is six of that theme's OWN tokens -- three tints then three shades,
 * read straight out of `[data-theme=...]` in Arvo's stylesheet. Nothing is
 * sampled or interpolated, so the tile is the theme rather than an impression
 * of it, and it cannot drift when Arvo retunes a theme. */
export const THEMES = [
  {
    id: 'o9theme',
    label: 'o9 Theme',
    hint: 'Default',
    ramp: ['#F2F2F2', '#E5E5E5', '#CCCCCC', '#4C4C4C', '#303030', '#010101'],
  },
  {
    id: 'o9default',
    label: 'Sky Blue',
    hint: '',
    ramp: ['#EFF8FF', '#E3F2FF', '#BBDDFF', '#3D6DCC', '#2758BA', '#204DA5'],
  },
  {
    id: 'o9green',
    label: 'Forest Green',
    hint: '',
    ramp: ['#EEF7F1', '#E5F3EA', '#BFE2CB', '#2E8B57', '#3A684E', '#2A5C44'],
  },
  {
    id: 'o9indigo',
    label: 'Midnight Indigo',
    hint: '',
    ramp: ['#F0F5FF', '#E4EEFF', '#C3D6EB', '#2A4058', '#1E344D', '#041E3A'],
  },
]

export const SEPARATORS = [
  { id: 'rows', label: 'Only rows', hint: 'Quieter — aligned columns already separate themselves' },
  { id: 'both', label: 'Rows and columns', hint: 'A rule in every gap' },
]

const DEFAULTS = { theme: 'o9theme', separators: 'rows' }

function read() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(read)

  useEffect(() => {
    /* The attribute goes on <html>, not on the app root, so anything Arvo
       portals to <body> -- panels, popovers, toasts -- is themed too. */
    document.documentElement.setAttribute('data-theme', settings.theme)
    document.documentElement.setAttribute('data-separators', settings.separators)
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(settings))
    } catch {
      /* Preference simply will not persist; the session still works. */
    }
  }, [settings])

  const value = useMemo(
    () => ({ ...settings, set: (key, v) => setSettings((s) => ({ ...s, [key]: v })) }),
    [settings]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
