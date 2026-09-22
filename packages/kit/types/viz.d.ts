/** The visual palette on its own, for anything that needs a colour without
 *  pulling in components. */
export type Shade = 'light' | 'soft' | 'bright' | 'base' | 'dark' | 'darker' | 'darkest'
export const ArvoVisualPalette: Record<string, Record<Shade, string>>
export const SERIES: string[]
export const INDICATOR: Record<string, string>
export function publishVizVars(): void
