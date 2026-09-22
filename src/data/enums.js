/**
 * The vocabularies the whole tracker agrees on.
 *
 * Kept in one file because a status is not a free-text field: Roadmap's board
 * columns, the filters, the summary cards and the analytics all have to mean
 * the same thing by "Blocked", and three separate lists would drift within a
 * week.
 *
 * `semantic` on each row is Arvo's SEMANTIC palette name -- these are interface
 * state (how a thing is doing), not data marks, so they never take a colour
 * from ArvoVisualPalette. Charts do; badges do not.
 *
 * Every one of these is also given a shape or a word, never colour alone:
 * `icon` on severity, the label itself on status.
 */

/* Every o9con name in this file is taken from tools/bi_to_o9con_map.json, whose
   values are verified against @arvo/assets current-icons.json. An invented name
   does not error -- it renders an empty box -- so they are never guessed. */
export const TYPES = [
  { id: 'new-request', label: 'New Request', icon: 'plus-circle' },
  { id: 'bug', label: 'Bug', icon: 'bug' },
  { id: 'enhancement', label: 'Enhancement', icon: 'bolt' },
  { id: 'upcoming', label: 'Upcoming Item', icon: 'calendar-check-o' },
]

export const AREAS_OF_WORK = [
  'Foundations/Tokens',
  'Component',
  'Pattern',
  'Figma Library',
  'Code Library',
  'Documentation',
  'Accessibility',
  'Tooling',
]

export const PRIORITIES = [
  { id: 'critical', label: 'Critical', semantic: 'negative', rank: 0 },
  { id: 'high', label: 'High', semantic: 'warning', rank: 1 },
  { id: 'medium', label: 'Medium', semantic: 'info', rank: 2 },
  { id: 'low', label: 'Low', semantic: 'none', rank: 3 },
]

/**
 * The work-item lifecycle, in order.
 *
 * `column: false` keeps a state off the Kanban board -- Released, Deferred and
 * Blocked are outcomes rather than stages, and giving each its own column made
 * the board eleven columns wide and mostly empty. They stay filterable in the
 * table, which is where you go looking for them.
 */
export const STATUSES = [
  { id: 'new', label: 'New', semantic: 'info', column: true },
  { id: 'under-review', label: 'Under Review', semantic: 'info', column: true },
  { id: 'accepted', label: 'Accepted', semantic: 'info', column: true },
  { id: 'planned', label: 'Planned', semantic: 'info', column: true },
  { id: 'in-design', label: 'In Design', semantic: 'warning', column: true },
  { id: 'ready-for-dev', label: 'Ready for Development', semantic: 'warning', column: true },
  { id: 'in-development', label: 'In Development', semantic: 'warning', column: true },
  { id: 'validation', label: 'Validation', semantic: 'warning', column: true },
  { id: 'released', label: 'Released', semantic: 'positive', column: false },
  { id: 'blocked', label: 'Blocked', semantic: 'negative', column: false },
  { id: 'deferred', label: 'Deferred', semantic: 'none', column: false },
]

/** States nothing is waiting on any more. Used by every "open" count. */
export const CLOSED_STATUSES = new Set(['released', 'deferred'])

export const VIOLATION_CATEGORIES = [
  'Non-Arvo component used',
  'Hard-coded color',
  'Hard-coded spacing',
  'Unsupported typography',
  'Incorrect component API',
  'Component override',
  'Accessibility issue',
  'Missing keyboard support',
  'Incorrect focus behavior',
  'Deprecated component',
  'Legacy dependency',
  'Missing design token',
  'Unapproved pattern',
]

/* Severity carries an icon as well as a tone, so it never depends on colour --
   the WCAG rule the scanner itself enforces applies to the scanner's own UI. */
export const SEVERITIES = [
  { id: 'critical', label: 'Critical', semantic: 'negative', icon: 'exclamation-triangle-filled', rank: 0 },
  { id: 'high', label: 'High', semantic: 'negative', icon: 'exclamation-circle', rank: 1 },
  { id: 'medium', label: 'Medium', semantic: 'warning', icon: 'info-circle', rank: 2 },
  { id: 'low', label: 'Low', semantic: 'info', icon: 'circle', rank: 3 },
]

/**
 * Violation lifecycle.
 *
 * "Accepted exception" and "False positive" are resolutions, not failures: a
 * team that argued a case and won should not keep showing up as owing work, and
 * a bad rule is the design system's bug, not theirs. Both count as settled.
 */
export const VIOLATION_STATUSES = [
  { id: 'new', label: 'New', semantic: 'negative' },
  { id: 'acknowledged', label: 'Acknowledged', semantic: 'warning' },
  { id: 'fix-planned', label: 'Fix planned', semantic: 'warning' },
  { id: 'in-progress', label: 'In progress', semantic: 'warning' },
  { id: 'resolved', label: 'Resolved', semantic: 'positive' },
  { id: 'accepted-exception', label: 'Accepted exception', semantic: 'info' },
  { id: 'false-positive', label: 'False positive', semantic: 'none' },
]

export const SETTLED_VIOLATION_STATUSES = new Set([
  'resolved',
  'accepted-exception',
  'false-positive',
])

export const MIGRATION_STATES = [
  { id: 'migrated', label: 'Migrated to Arvo' },
  { id: 'partial', label: 'Partially migrated' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'blocked', label: 'Blocked' },
]

/* ---- Lookups ------------------------------------------------------------ */

const index = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]))

export const TYPE = index(TYPES)
export const PRIORITY = index(PRIORITIES)
export const STATUS = index(STATUSES)
export const SEVERITY = index(SEVERITIES)
export const VIOLATION_STATUS = index(VIOLATION_STATUSES)

/** Arvo's select takes `{ id, value, label }`; every enum here can become one. */
export const toItems = (rows) => rows.map((r) => ({ id: r.id, value: r.id, label: r.label }))
/** For the plain string vocabularies (areas of work, violation categories). */
export const toStringItems = (values) => values.map((v) => ({ id: v, value: v, label: v }))
