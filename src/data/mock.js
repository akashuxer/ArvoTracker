/**
 * Mock data for the first version.
 *
 * Shaped exactly like what the real sources will send, so swapping a fetch in
 * later is a change of origin rather than a change of model:
 *
 *   workItems   -> the design-system backlog (today: this file)
 *   areas       -> component-import analysis per product area
 *   pushes      -> git push / pull-request webhook
 *   violations  -> the Arvo lint rules, axe, and token validation, per push
 *
 * `importScan` in store.jsx accepts the push-shaped payload directly, which is
 * the seam the CI job will post to.
 *
 * Everything is deterministic. A seeded generator fills the long tail so the
 * analytics have ten weeks of shape, while the rows a reader is likely to open
 * are written by hand -- a dashboard of plausible noise is no use for judging
 * whether the detail views actually say anything.
 */
import { RULES } from './rules'
import { AREA_COMPONENTS } from './catalog'

/* Anchored, not `new Date()`: a fixture whose "last week" moves every morning
   makes two people looking at the same screen disagree. */
export const TODAY = new Date('2026-09-22T09:00:00Z')

const day = 86_400_000
const daysAgo = (n) => new Date(TODAY.getTime() - n * day).toISOString()
const iso = (s) => new Date(s).toISOString()

/* ---- Teams and people --------------------------------------------------- */

export const TEAMS = [
  { id: 'dashboard', name: 'Dashboard Team', contact: 'Priya Raghavan', repos: ['platform-dashboard'] },
  { id: 'planning', name: 'Planning Team', contact: 'Marcus Feld', repos: ['platform-planning', 'planning-scenarios'] },
  { id: 'grid', name: 'Grid Platform', contact: 'Sofia Almeida', repos: ['platform-grid'] },
  { id: 'admin', name: 'Admin & Identity', contact: 'Tomas Novak', repos: ['platform-admin'] },
  { id: 'insights', name: 'Insights & Reporting', contact: 'Hannah Boateng', repos: ['platform-reporting'] },
  { id: 'qa', name: 'Quality Automation', contact: 'Akash Upadhyay', repos: ['platform-quality'] },
  { id: 'arvo', name: 'Design System', contact: 'Ines Duarte', repos: ['o9-design-system'] },
]

export const TEAM = Object.fromEntries(TEAMS.map((t) => [t.id, t]))

export const OWNERS = [
  'Ines Duarte',
  'Lukas Brenner',
  'Mei Tanaka',
  'Priya Raghavan',
  'Sofia Almeida',
  'Hannah Boateng',
  'Marcus Feld',
]

export const RELEASES = ['25.09', '25.10', '25.11', '26.01', 'Unscheduled']

/* ---- 1. Roadmap --------------------------------------------------------- */

/**
 * One data source for all five Roadmap tabs. The tabs are filters over this
 * array, never separate lists -- an item that changes type must not have to be
 * moved between collections, and a count must not be able to disagree with the
 * table it summarises.
 */
export const WORK_ITEMS = [
  {
    id: 'ARV-412',
    title: 'Combobox loses its selection when the list is filtered',
    problem:
      'Typing to filter ArvoCombobox and then clearing the query drops the already-selected value. Planning has three screens where the field silently empties, so a user saves a scenario with no owner and no error.',
    type: 'bug',
    area: 'Component',
    component: 'ArvoCombobox',
    requestedBy: 'Marcus Feld',
    requestingTeam: 'planning',
    owner: 'Lukas Brenner',
    priority: 'critical',
    status: 'in-development',
    targetRelease: '25.10',
    requiredBy: iso('2026-10-03'),
    created: daysAgo(19),
    updated: daysAgo(2),
    figma: 'https://figma.com/file/arvo-combobox',
    ticket: 'https://o9git.visualstudio.com/CoreDev/_workitems/edit/88412',
    notes: [
      { at: daysAgo(19), by: 'Marcus Feld', text: 'Raised with a repro on the scenario owner field.' },
      { at: daysAgo(14), by: 'Ines Duarte', text: 'Reproduced. The filter rebuilds the item list and the selected id is resolved against the filtered set, so it reads as absent.' },
      { at: daysAgo(2), by: 'Lukas Brenner', text: 'Fix holds the selection outside the filtered list. Tests added for filter-then-clear.' },
    ],
  },
  {
    id: 'ARV-407',
    title: 'ArvoContextMenu never sets .open, and onSelect never fires',
    problem:
      'Two defects in 3.1.2 that together make the component unusable without a workaround. Quality Automation carries a local shim in @o9qa/kit for every table it renders.',
    type: 'bug',
    area: 'Component',
    component: 'ArvoContextMenu',
    requestedBy: 'Akash Upadhyay',
    requestingTeam: 'qa',
    owner: 'Mei Tanaka',
    priority: 'high',
    status: 'validation',
    targetRelease: '25.10',
    requiredBy: iso('2026-10-10'),
    created: daysAgo(41),
    updated: daysAgo(5),
    figma: '',
    ticket: 'https://o9git.visualstudio.com/CoreDev/_workitems/edit/88407',
    notes: [
      { at: daysAgo(41), by: 'Akash Upadhyay', text: 'Shimmed in useContextMenuOpen. Two separate bugs, one component.' },
      { at: daysAgo(5), by: 'Mei Tanaka', text: 'Both fixed. Waiting on the consumer check before release -- the shim must be removable, not merely optional.' },
    ],
  },
  {
    id: 'ARV-398',
    title: 'ArvoBreadcrumb does not call onNavigate',
    problem:
      'The anchor activates and the href is followed, so every consumer catches the click on the way up instead. Three apps now have the same workaround.',
    type: 'bug',
    area: 'Component',
    component: 'ArvoBreadcrumb',
    requestedBy: 'Akash Upadhyay',
    requestingTeam: 'qa',
    owner: 'Mei Tanaka',
    priority: 'high',
    status: 'ready-for-dev',
    targetRelease: '25.11',
    requiredBy: '',
    created: daysAgo(52),
    updated: daysAgo(11),
    figma: '',
    ticket: 'https://o9git.visualstudio.com/CoreDev/_workitems/edit/88398',
    notes: [
      { at: daysAgo(52), by: 'Akash Upadhyay', text: 'Same workaround appearing independently in three repos is a system defect, not three app defects.' },
    ],
  },
  {
    id: 'ARV-421',
    title: 'ArvoPopover teleports to 0,0 while closing',
    problem:
      'The position is cleared one frame before the exit transition finishes, so the panel jumps to the top-left corner on the way out. Visible on every popover in the product.',
    type: 'bug',
    area: 'Component',
    component: 'ArvoPopover',
    requestedBy: 'Akash Upadhyay',
    requestingTeam: 'qa',
    owner: 'Lukas Brenner',
    priority: 'medium',
    status: 'accepted',
    targetRelease: '25.11',
    requiredBy: '',
    created: daysAgo(9),
    updated: daysAgo(4),
    figma: '',
    ticket: '',
    notes: [{ at: daysAgo(4), by: 'Ines Duarte', text: 'Accepted. Root cause is the overlay hub clearing style before transitionend.' }],
  },
  {
    id: 'ARV-388',
    title: 'ArvoTextarea label size does not match the other form fields',
    problem:
      'Textarea defaults its label to 14px while Textbox and Select render 12px, so the last label in a form comes out visibly bigger than the rest.',
    type: 'bug',
    area: 'Component',
    component: 'ArvoTextarea',
    requestedBy: 'Priya Raghavan',
    requestingTeam: 'dashboard',
    owner: 'Mei Tanaka',
    priority: 'low',
    status: 'released',
    targetRelease: '25.09',
    requiredBy: '',
    created: daysAgo(74),
    updated: daysAgo(31),
    figma: '',
    ticket: '',
    notes: [{ at: daysAgo(31), by: 'Mei Tanaka', text: 'Shipped in 3.1.2. Consumers can drop size="sm".' }],
  },
  {
    id: 'ARV-430',
    title: 'Data-density token set for compact grids',
    problem:
      'The Grid platform renders 40-row viewports where the standard 12px rhythm wastes a third of the screen. Every team solving this reaches for literal px, which is what ARVO-SPACE-001 keeps flagging.',
    type: 'new-request',
    area: 'Foundations/Tokens',
    component: '',
    requestedBy: 'Sofia Almeida',
    requestingTeam: 'grid',
    owner: 'Ines Duarte',
    priority: 'high',
    status: 'under-review',
    targetRelease: '25.11',
    requiredBy: iso('2026-11-14'),
    created: daysAgo(12),
    updated: daysAgo(3),
    figma: 'https://figma.com/file/arvo-density',
    ticket: '',
    notes: [
      { at: daysAgo(12), by: 'Sofia Almeida', text: '17 hard-coded spacing violations in platform-grid all trace back to this gap.' },
      { at: daysAgo(3), by: 'Ines Duarte', text: 'Under review. Leaning toward a density scale rather than new steps, so it composes with what exists.' },
    ],
  },
  {
    id: 'ARV-433',
    title: 'Virtualised table pattern',
    problem:
      'Three teams have written their own windowing around ArvoTable. None handles sticky headers with a horizontal scroll, and two break keyboard navigation past the rendered window.',
    type: 'new-request',
    area: 'Pattern',
    component: 'ArvoTable',
    requestedBy: 'Sofia Almeida',
    requestingTeam: 'grid',
    owner: '',
    priority: 'high',
    status: 'new',
    targetRelease: 'Unscheduled',
    requiredBy: iso('2026-12-01'),
    created: daysAgo(6),
    updated: daysAgo(6),
    figma: '',
    ticket: '',
    notes: [{ at: daysAgo(6), by: 'Sofia Almeida', text: 'Raised after the third independent implementation appeared in review.' }],
  },
  {
    id: 'ARV-435',
    title: 'Figma library is a version behind the code library',
    problem:
      'The published Figma library still shows 3.0 chip variants. Designers hand over a spec the code cannot build, and the mismatch is found in development rather than in design review.',
    type: 'new-request',
    area: 'Figma Library',
    component: 'ArvoChip',
    requestedBy: 'Hannah Boateng',
    requestingTeam: 'insights',
    owner: 'Ines Duarte',
    priority: 'critical',
    status: 'blocked',
    targetRelease: '25.10',
    requiredBy: iso('2026-09-30'),
    created: daysAgo(15),
    updated: daysAgo(1),
    figma: 'https://figma.com/file/arvo-library',
    ticket: '',
    notes: [
      { at: daysAgo(15), by: 'Hannah Boateng', text: 'Two handovers lost to this in one sprint.' },
      { at: daysAgo(1), by: 'Ines Duarte', text: 'Blocked: the library publish step needs an Enterprise seat that is still in procurement. Not a design or code problem.' },
    ],
  },
  {
    id: 'ARV-436',
    title: 'Toast placement cannot be set per call',
    problem:
      'Position is a provider-level setting, so a long-running import cannot put its completion toast where the user is actually looking.',
    type: 'new-request',
    area: 'Component',
    component: 'ArvoToast',
    requestedBy: 'Priya Raghavan',
    requestingTeam: 'dashboard',
    owner: '',
    priority: 'low',
    status: 'new',
    targetRelease: 'Unscheduled',
    requiredBy: '',
    created: daysAgo(4),
    updated: daysAgo(4),
    figma: '',
    ticket: '',
    notes: [],
  },
  {
    id: 'ARV-440',
    title: 'Keyboard shortcut documentation per component',
    problem:
      'The key set a component handles is in the descriptor but not on the docs page, so teams re-implement Escape and Arrow handling that already exists and then fight the component for the event.',
    type: 'new-request',
    area: 'Documentation',
    component: '',
    requestedBy: 'Tomas Novak',
    requestingTeam: 'admin',
    owner: 'Hannah Boateng',
    priority: 'medium',
    status: 'planned',
    targetRelease: '25.11',
    requiredBy: '',
    created: daysAgo(22),
    updated: daysAgo(7),
    figma: '',
    ticket: '',
    notes: [],
  },
  {
    id: 'ARV-418',
    title: 'ArvoSelect should accept an async item loader',
    problem:
      'Admin loads 4,000 permission scopes. Every consumer writes the same debounce, cache and in-flight guard around the items prop.',
    type: 'enhancement',
    area: 'Component',
    component: 'ArvoSelect',
    requestedBy: 'Tomas Novak',
    requestingTeam: 'admin',
    owner: 'Lukas Brenner',
    priority: 'high',
    status: 'in-design',
    targetRelease: '25.11',
    requiredBy: iso('2026-11-20'),
    created: daysAgo(34),
    updated: daysAgo(6),
    figma: 'https://figma.com/file/arvo-select-async',
    ticket: 'https://o9git.visualstudio.com/CoreDev/_workitems/edit/88418',
    notes: [
      { at: daysAgo(6), by: 'Ines Duarte', text: 'In design. The open question is whether this is Select or a Combobox variant -- the difference matters for how the empty and error states read.' },
    ],
  },
  {
    id: 'ARV-425',
    title: 'Expose --arvo-btn-* for label and icon sizing',
    problem:
      'Dashboard needs a denser button in a toolbar and has no supported way to get one, so it overrides .arvo-btn__lbl -- which is what ARVO-COMP-002 flags in four repositories.',
    type: 'enhancement',
    area: 'Component',
    component: 'ArvoButton',
    requestedBy: 'Priya Raghavan',
    requestingTeam: 'dashboard',
    owner: 'Mei Tanaka',
    priority: 'high',
    status: 'in-development',
    targetRelease: '25.10',
    requiredBy: iso('2026-10-15'),
    created: daysAgo(28),
    updated: daysAgo(1),
    figma: '',
    ticket: 'https://o9git.visualstudio.com/CoreDev/_workitems/edit/88425',
    notes: [
      { at: daysAgo(28), by: 'Priya Raghavan', text: 'We know the override is wrong. There is no alternative today.' },
      { at: daysAgo(10), by: 'Ines Duarte', text: 'Fair. Four teams doing the same override is a missing variable, not four mistakes.' },
    ],
  },
  {
    id: 'ARV-428',
    title: 'axe rules in the component test template',
    problem:
      'Accessibility defects are found by the push scanner rather than by the component test, which means they are found after they ship rather than before.',
    type: 'enhancement',
    area: 'Tooling',
    component: '',
    requestedBy: 'Ines Duarte',
    requestingTeam: 'arvo',
    owner: 'Ines Duarte',
    priority: 'medium',
    status: 'in-development',
    targetRelease: '25.10',
    requiredBy: '',
    created: daysAgo(26),
    updated: daysAgo(8),
    figma: '',
    ticket: '',
    notes: [],
  },
  {
    id: 'ARV-431',
    title: 'Dark-variant contrast audit for the visual palette',
    problem:
      'Four series shades pass AA on the light canvas and fail on the dark one. Charts are the only place the two canvases are not checked together.',
    type: 'enhancement',
    area: 'Accessibility',
    component: '',
    requestedBy: 'Hannah Boateng',
    requestingTeam: 'insights',
    owner: 'Hannah Boateng',
    priority: 'critical',
    status: 'in-development',
    targetRelease: '25.10',
    requiredBy: iso('2026-10-08'),
    created: daysAgo(17),
    updated: daysAgo(2),
    figma: '',
    ticket: 'https://o9git.visualstudio.com/CoreDev/_workitems/edit/88431',
    notes: [
      { at: daysAgo(2), by: 'Hannah Boateng', text: 'Nine of 63 series/canvas pairs fail. Fix is a per-canvas series order, not new colours.' },
    ],
  },
  {
    id: 'ARV-405',
    title: 'Panel remembers its resized width',
    problem: 'A docked panel resets to defaultSize on every open, so a user who widened it re-widens it each time.',
    type: 'enhancement',
    area: 'Component',
    component: 'ArvoPanel',
    requestedBy: 'Sofia Almeida',
    requestingTeam: 'grid',
    owner: 'Lukas Brenner',
    priority: 'low',
    status: 'released',
    targetRelease: '25.09',
    requiredBy: '',
    created: daysAgo(96),
    updated: daysAgo(44),
    figma: '',
    ticket: '',
    notes: [],
  },
  {
    id: 'ARV-442',
    title: 'Deprecate ArvoLegacyTable',
    problem:
      'Superseded by ArvoTable in 3.0. Still imported in two product areas, both of which are on the Modernization board.',
    type: 'upcoming',
    area: 'Code Library',
    component: 'ArvoLegacyTable',
    requestedBy: 'Ines Duarte',
    requestingTeam: 'arvo',
    owner: 'Ines Duarte',
    priority: 'medium',
    status: 'planned',
    targetRelease: '26.01',
    requiredBy: iso('2027-01-15'),
    created: daysAgo(30),
    updated: daysAgo(9),
    figma: '',
    ticket: '',
    notes: [
      { at: daysAgo(9), by: 'Ines Duarte', text: 'Announce at 25.11, remove at 26.01. Both owning teams contacted before the announcement, not after.' },
    ],
  },
  {
    id: 'ARV-444',
    title: 'Motion tokens for enter and exit transitions',
    problem:
      'Duration and easing tokens exist; the enter/exit pairs teams actually need do not, so every overlay picks its own and no two agree.',
    type: 'upcoming',
    area: 'Foundations/Tokens',
    component: '',
    requestedBy: 'Ines Duarte',
    requestingTeam: 'arvo',
    owner: 'Mei Tanaka',
    priority: 'medium',
    status: 'planned',
    targetRelease: '26.01',
    requiredBy: '',
    created: daysAgo(24),
    updated: daysAgo(13),
    figma: 'https://figma.com/file/arvo-motion',
    ticket: '',
    notes: [],
  },
  {
    id: 'ARV-447',
    title: 'Arvo lint rules as a shareable ESLint config',
    problem:
      'The scanner that fills this tracker runs in CI only. The same rules in the editor would move most findings from "after the push" to "while typing".',
    type: 'upcoming',
    area: 'Tooling',
    component: '',
    requestedBy: 'Akash Upadhyay',
    requestingTeam: 'qa',
    owner: 'Ines Duarte',
    priority: 'high',
    status: 'under-review',
    targetRelease: '26.01',
    requiredBy: '',
    created: daysAgo(11),
    updated: daysAgo(5),
    figma: '',
    ticket: '',
    notes: [
      { at: daysAgo(5), by: 'Ines Duarte', text: 'Strongly in favour. The scanner is a safety net; it should not be the first time anyone hears about a violation.' },
    ],
  },
  {
    id: 'ARV-449',
    title: 'Theme editor for tenant-level palettes',
    problem:
      'Tenants ask for their own accent. Today that is a fork of the theme SCSS, which then never receives a token update.',
    type: 'upcoming',
    area: 'Tooling',
    component: '',
    requestedBy: 'Marcus Feld',
    requestingTeam: 'planning',
    owner: '',
    priority: 'low',
    status: 'deferred',
    targetRelease: 'Unscheduled',
    requiredBy: '',
    created: daysAgo(63),
    updated: daysAgo(38),
    figma: '',
    ticket: '',
    notes: [
      { at: daysAgo(38), by: 'Ines Duarte', text: 'Deferred, not rejected: it needs the semantic layer to be complete first, or a tenant can recolour something that is load-bearing.' },
    ],
  },
  {
    id: 'ARV-451',
    title: 'Document the o9con icon set with search',
    problem:
      '1,067 icons and no searchable index outside the cheatsheet HTML, so names get guessed. A guessed name renders an empty box and nothing errors.',
    type: 'enhancement',
    area: 'Documentation',
    component: '',
    requestedBy: 'Akash Upadhyay',
    requestingTeam: 'qa',
    owner: 'Hannah Boateng',
    priority: 'medium',
    status: 'ready-for-dev',
    targetRelease: '25.11',
    requiredBy: '',
    created: daysAgo(20),
    updated: daysAgo(10),
    figma: '',
    ticket: '',
    notes: [],
  },
  {
    id: 'ARV-453',
    title: 'ArvoDateRangePicker rejects a valid single-day range',
    problem: 'Selecting the same date as start and end clears the field instead of producing a one-day range.',
    type: 'bug',
    area: 'Component',
    component: 'ArvoDateRangePicker',
    requestedBy: 'Hannah Boateng',
    requestingTeam: 'insights',
    owner: 'Lukas Brenner',
    priority: 'medium',
    status: 'new',
    targetRelease: 'Unscheduled',
    requiredBy: iso('2026-10-24'),
    created: daysAgo(3),
    updated: daysAgo(3),
    figma: '',
    ticket: '',
    notes: [],
  },
  {
    id: 'ARV-455',
    title: 'Token names in the Figma library do not match the code',
    problem:
      'Figma publishes `color/surface/layer-01`; the code token is `--arvo-color-s-layer-01`. Every handover involves a translation step done from memory.',
    type: 'bug',
    area: 'Figma Library',
    component: '',
    requestedBy: 'Priya Raghavan',
    requestingTeam: 'dashboard',
    owner: 'Ines Duarte',
    priority: 'high',
    status: 'under-review',
    targetRelease: '25.11',
    requiredBy: '',
    created: daysAgo(8),
    updated: daysAgo(8),
    figma: 'https://figma.com/file/arvo-library',
    ticket: '',
    notes: [],
  },
  {
    id: 'ARV-457',
    title: 'Grid cell focus ring is clipped by the sticky header',
    problem: 'The ring is drawn inside the cell, so the top row of a scrolled grid shows half a ring.',
    type: 'bug',
    area: 'Accessibility',
    component: 'ArvoTable',
    requestedBy: 'Sofia Almeida',
    requestingTeam: 'grid',
    owner: 'Mei Tanaka',
    priority: 'high',
    status: 'blocked',
    targetRelease: '25.10',
    requiredBy: iso('2026-10-06'),
    created: daysAgo(13),
    updated: daysAgo(2),
    figma: '',
    ticket: '',
    notes: [
      { at: daysAgo(2), by: 'Mei Tanaka', text: 'Blocked on ARV-433: the fix needs the virtualised table pattern settled, or it will be written twice.' },
    ],
  },
]

/* ---- 2. Modernization --------------------------------------------------- */

/**
 * Migration state per product area.
 *
 * `migrated + partial + legacy + blocked` always equals `total`. The percentage
 * is derived rather than stored, so a number that has been edited cannot
 * disagree with the bar drawn beside it.
 */
export const AREAS = [
  {
    id: 'global-nav',
    name: 'Global Navigation',
    team: 'dashboard',
    owner: 'Priya Raghavan',
    total: 24,
    migrated: 24,
    partial: 0,
    legacy: 0,
    blocked: 0,
    target: iso('2026-06-30'),
    arvoVersion: '3.1.2',
    lastActivity: daysAgo(12),
    dependencies: [],
    notes: 'First area migrated, and the reference for the rest. Kept on the current Arvo minor deliberately so a regression shows up here first.',
    components: {
      migrated: ['ArvoAppBar', 'ArvoRail', 'ArvoBreadcrumb', 'ArvoAvatar', 'ArvoPopover', 'ArvoBadge'],
      legacy: [],
    },
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    team: 'dashboard',
    owner: 'Priya Raghavan',
    total: 46,
    migrated: 31,
    partial: 9,
    legacy: 6,
    blocked: 0,
    target: iso('2026-11-28'),
    arvoVersion: '3.1.2',
    lastActivity: daysAgo(1),
    dependencies: ['ARV-425'],
    notes: 'KPI tiles are the remaining work. The toolbar buttons override .arvo-btn__lbl and cannot be cleaned up until ARV-425 ships the variable.',
    components: {
      migrated: ['ArvoCard', 'ArvoButton', 'ArvoSelect', 'ArvoChip', 'ArvoTooltip'],
      legacy: ['LegacyKpiTile', 'LegacySparkline', 'ArvoLegacyTable'],
    },
  },
  {
    id: 'grid',
    name: 'Pivot/Grid',
    team: 'grid',
    owner: 'Sofia Almeida',
    total: 62,
    migrated: 18,
    partial: 14,
    legacy: 22,
    blocked: 8,
    target: iso('2027-03-31'),
    arvoVersion: '3.0.4',
    lastActivity: daysAgo(2),
    dependencies: ['ARV-433', 'ARV-430', 'ARV-457'],
    notes: 'The largest and the furthest behind, for a real reason: no approved virtualised table pattern exists, so the eight blocked components have nowhere to go yet. Not a prioritisation failure.',
    components: {
      migrated: ['ArvoTable', 'ArvoCheckbox', 'ArvoIconButton'],
      legacy: ['LegacyPivotHeader', 'LegacyCellEditor', 'LegacyColumnMenu', 'ArvoLegacyTable', 'VirtualScroller'],
    },
  },
  {
    id: 'filters',
    name: 'Filters',
    team: 'grid',
    owner: 'Sofia Almeida',
    total: 19,
    migrated: 14,
    partial: 3,
    legacy: 2,
    blocked: 0,
    target: iso('2026-10-31'),
    arvoVersion: '3.1.2',
    lastActivity: daysAgo(4),
    dependencies: ['ARV-418'],
    notes: 'The scope picker waits on the async item loader; everything else is done.',
    components: { migrated: ['ArvoSelect', 'ArvoChip', 'ArvoSearch', 'ArvoDatePicker'], legacy: ['LegacyScopePicker'] },
  },
  {
    id: 'workflow',
    name: 'Workflow',
    team: 'planning',
    owner: 'Marcus Feld',
    total: 33,
    migrated: 20,
    partial: 7,
    legacy: 6,
    blocked: 0,
    target: iso('2026-12-19'),
    arvoVersion: '3.1.0',
    lastActivity: daysAgo(6),
    dependencies: ['ARV-412'],
    notes: 'On track. The combobox bug is the only thing holding the approval step.',
    components: { migrated: ['ArvoStepper', 'ArvoButton', 'ArvoAlertDialog'], legacy: ['LegacyApprovalChain', 'LegacyCommentThread'] },
  },
  {
    id: 'forms',
    name: 'Forms',
    team: 'planning',
    owner: 'Marcus Feld',
    total: 28,
    migrated: 22,
    partial: 4,
    legacy: 2,
    blocked: 0,
    target: iso('2026-10-17'),
    arvoVersion: '3.1.2',
    lastActivity: daysAgo(3),
    dependencies: [],
    notes: 'Close to done. Remaining two are file-upload fields with no Arvo equivalent yet.',
    components: { migrated: ['ArvoTextbox', 'ArvoTextarea', 'ArvoSelect', 'ArvoRadioGroup', 'ArvoCheckbox', 'ArvoSwitch'], legacy: ['LegacyFileDrop'] },
  },
  {
    id: 'admin',
    name: 'Administration',
    team: 'admin',
    owner: 'Tomas Novak',
    total: 37,
    migrated: 9,
    partial: 6,
    legacy: 22,
    blocked: 0,
    /* No target date. That is the finding, not an omission: nothing can be
       planned until the version bump is scheduled. */
    target: '',
    arvoVersion: '2.2.5',
    lastActivity: daysAgo(29),
    dependencies: ['ARV-418'],
    notes: 'Two majors behind, which is why the violation count here is mostly Incorrect component API -- the props changed under them. Needs a version bump before any migration work is worth doing.',
    components: { migrated: ['ArvoTextbox', 'ArvoButton'], legacy: ['LegacyPermissionTree', 'LegacyRoleMatrix', 'LegacyTenantSwitcher', 'ArvoLegacyTable'] },
  },
  {
    id: 'notifications',
    name: 'Notifications',
    team: 'dashboard',
    owner: 'Hannah Boateng',
    total: 12,
    migrated: 11,
    partial: 1,
    legacy: 0,
    blocked: 0,
    target: iso('2026-09-30'),
    arvoVersion: '3.1.2',
    lastActivity: daysAgo(8),
    dependencies: ['ARV-436'],
    notes: 'Effectively complete. The toast placement request is a nicety, not a blocker.',
    components: { migrated: ['ArvoToast', 'ArvoBadge', 'ArvoPopover'], legacy: [] },
  },
  {
    id: 'reporting',
    name: 'Reporting',
    team: 'insights',
    owner: 'Hannah Boateng',
    total: 41,
    migrated: 25,
    partial: 8,
    legacy: 5,
    blocked: 3,
    target: iso('2027-01-30'),
    arvoVersion: '3.1.2',
    lastActivity: daysAgo(2),
    dependencies: ['ARV-431'],
    notes: 'Charts are blocked on the dark-variant contrast audit: migrating them now would ship nine failing series/canvas pairs.',
    components: { migrated: ['ArvoTable', 'ArvoSelect', 'ArvoTabs'], legacy: ['LegacyChartLegend', 'LegacyExportMenu'] },
  },
  {
    id: 'scenario',
    name: 'Scenario Planning',
    team: 'planning',
    owner: 'Marcus Feld',
    total: 26,
    migrated: 12,
    partial: 5,
    legacy: 9,
    blocked: 0,
    target: iso('2027-02-27'),
    arvoVersion: '3.1.0',
    lastActivity: daysAgo(5),
    dependencies: ['ARV-412', 'ARV-433'],
    notes: 'Comparison grids depend on the same virtualised table pattern as Pivot/Grid; doing them in either order duplicates the work.',
    components: { migrated: ['ArvoCard', 'ArvoSelect', 'ArvoChip'], legacy: ['LegacyComparisonGrid', 'LegacyScenarioTree'] },
  },
]

/* ---- 3. Violations ------------------------------------------------------ */

/* Deterministic, so two readers see the same dashboard and a screenshot stays
   true. Math.random would reshuffle the analytics on every reload. */
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

const REPO_AREA = {
  'platform-dashboard': ['dashboard', 'global-nav', 'notifications'],
  'platform-planning': ['workflow', 'forms', 'scenario'],
  'platform-grid': ['grid', 'filters'],
  'platform-admin': ['admin'],
  'platform-reporting': ['reporting'],
}

/**
 * The developers.
 *
 * `fluency` is how far along this person is with Arvo, 0 to 1. It biases how
 * much of their UI work reaches for an Arvo component rather than a legacy one,
 * and how often they trip a rule.
 *
 * It exists so the developer view has something real to show. The point of
 * that view is to find who would benefit from a conversation -- someone at 0.3
 * who is climbing needs different help from someone at 0.3 who is flat, and a
 * single ranked list would show them as the same person.
 */
export const DEVELOPERS = [
  { id: 'priya', name: 'Priya Raghavan', team: 'dashboard', repo: 'platform-dashboard', fluency: 0.86 },
  { id: 'devon', name: 'Devon Clarke', team: 'dashboard', repo: 'platform-dashboard', fluency: 0.52 },
  { id: 'aarti', name: 'Aarti Menon', team: 'dashboard', repo: 'platform-dashboard', fluency: 0.34 },
  { id: 'marcus', name: 'Marcus Feld', team: 'planning', repo: 'platform-planning', fluency: 0.78 },
  { id: 'jonas', name: 'Jonas Weber', team: 'planning', repo: 'platform-planning', fluency: 0.61 },
  { id: 'lin', name: 'Lin Chen', team: 'planning', repo: 'platform-planning', fluency: 0.44 },
  { id: 'sofia', name: 'Sofia Almeida', team: 'grid', repo: 'platform-grid', fluency: 0.71 },
  { id: 'rui', name: 'Rui Costa', team: 'grid', repo: 'platform-grid', fluency: 0.38 },
  { id: 'nadia', name: 'Nadia Farouk', team: 'grid', repo: 'platform-grid', fluency: 0.29 },
  { id: 'tomas', name: 'Tomas Novak', team: 'admin', repo: 'platform-admin', fluency: 0.33 },
  { id: 'eva', name: 'Eva Horak', team: 'admin', repo: 'platform-admin', fluency: 0.22 },
  { id: 'hannah', name: 'Hannah Boateng', team: 'insights', repo: 'platform-reporting', fluency: 0.81 },
  { id: 'kwame', name: 'Kwame Osei', team: 'insights', repo: 'platform-reporting', fluency: 0.57 },
]

export const DEVELOPER = Object.fromEntries(DEVELOPERS.map((d) => [d.name, d]))

const AUTHORS = Object.fromEntries(
  [...new Set(DEVELOPERS.map((d) => d.repo))].map((repo) => [
    repo,
    DEVELOPERS.filter((d) => d.repo === repo).map((d) => d.name),
  ])
)

const TEAM_OF_REPO = Object.fromEntries(
  TEAMS.flatMap((t) => t.repos.map((r) => [r, t.id]))
)

const BRANCHES = ['feature/new-kpi', 'feature/scope-picker', 'fix/grid-focus', 'feature/role-matrix', 'feature/export-menu', 'chore/token-sweep', 'feature/approval-step']
const MESSAGES = [
  'Add inventory KPI cards',
  'Wire the scope picker to the new endpoint',
  'Restore focus after the cell editor closes',
  'Role matrix: bulk assign',
  'Export menu: add CSV',
  'Sweep literal spacing values',
  'Approval step: reviewer list',
]

const FILES = {
  dashboard: ['src/components/InventoryKPI.tsx', 'src/components/KpiTile.tsx', 'src/toolbar/DenseToolbar.tsx'],
  'global-nav': ['src/nav/TenantMenu.tsx', 'src/nav/Rail.tsx'],
  notifications: ['src/notify/ToastHost.tsx'],
  workflow: ['src/flow/ApprovalChain.tsx', 'src/flow/StepHeader.tsx'],
  forms: ['src/forms/FileDrop.tsx', 'src/forms/ScenarioForm.tsx'],
  scenario: ['src/scenario/ComparisonGrid.tsx', 'src/scenario/ScenarioTree.tsx'],
  grid: ['src/grid/PivotHeader.tsx', 'src/grid/CellEditor.tsx', 'src/grid/ColumnMenu.tsx'],
  filters: ['src/filters/ScopePicker.tsx', 'src/filters/FilterChips.tsx'],
  admin: ['src/admin/PermissionTree.tsx', 'src/admin/RoleMatrix.tsx', 'src/admin/TenantSwitcher.tsx'],
  reporting: ['src/report/ChartLegend.tsx', 'src/report/ExportMenu.tsx', 'src/report/ReportTable.tsx'],
}

/* Which rules each area actually trips, rather than a uniform spread. Admin is
   two majors behind so its findings are API drift; Grid has no virtualisation
   pattern so its findings are overrides and keyboard gaps. The shape of the
   analytics should tell that story on its own. */
const AREA_RULES = {
  dashboard: ['ARVO-COLOR-001', 'ARVO-COMP-002', 'ARVO-SPACE-001', 'ARVO-TYPE-002'],
  'global-nav': ['ARVO-SPACE-001', 'ARVO-A11Y-001'],
  notifications: ['ARVO-COLOR-002'],
  workflow: ['ARVO-COMP-003', 'ARVO-A11Y-004', 'ARVO-SPACE-001'],
  forms: ['ARVO-COMP-001', 'ARVO-A11Y-001'],
  scenario: ['ARVO-COMP-001', 'ARVO-DEP-001', 'ARVO-PATTERN-001'],
  grid: ['ARVO-COMP-002', 'ARVO-A11Y-003', 'ARVO-SPACE-001', 'ARVO-TOKEN-001', 'ARVO-A11Y-004'],
  filters: ['ARVO-COMP-003', 'ARVO-SPACE-001'],
  admin: ['ARVO-COMP-003', 'ARVO-COMP-004', 'ARVO-DEP-001', 'ARVO-TYPE-001', 'ARVO-A11Y-001'],
  reporting: ['ARVO-A11Y-002', 'ARVO-COLOR-002', 'ARVO-COMP-004'],
}

const REPOS = Object.keys(REPO_AREA)

/**
 * Thirteen months of pull requests, and the pushes inside them.
 *
 * Thirteen rather than twelve so that every month on a twelve-month chart has a
 * real month before it to be compared against. A year of data makes the first
 * bar's movement unknowable.
 *
 * A PR is the unit of adoption, not a push: adoption is a property of a change
 * that got reviewed and merged, and a branch that was force-pushed four times
 * is one decision, not four. Violations still attach to pushes, because that is
 * what a scanner actually sees.
 *
 * `ramp` is the story in the data: Arvo adoption climbs over the year. Without
 * it every month looks the same and a month-over-month view says nothing.
 */
/* Just over two years. Long enough that the yearly grain has three real buckets
   to compare rather than two, and that a quarter-over-quarter figure is not
   reading half its own history. */
const HISTORY_DAYS = 800

function buildPullRequests() {
  const rnd = seeded(20260922)
  const prs = []
  const pushes = []
  let prNumber = 800

  for (let d = HISTORY_DAYS; d >= 0; d -= 1) {
    /* 0 at the start of the history, 1 today. */
    const ramp = 1 - d / HISTORY_DAYS

    REPOS.forEach((repo) => {
      /* Not every repo opens a PR every day. Reporting and Admin are quieter,
         which is the honest reason their counts are lower. */
      const chance = repo === 'platform-admin' ? 0.16 : repo === 'platform-reporting' ? 0.2 : 0.34
      if (rnd() > chance) return

      const areas = REPO_AREA[repo]
      const area = areas[Math.floor(rnd() * areas.length)]
      const authors = AUTHORS[repo]
      const author = authors[Math.floor(rnd() * authors.length)]
      const dev = DEVELOPER[author]
      const i = Math.floor(rnd() * BRANCHES.length)
      const pool = AREA_COMPONENTS[area] ?? { arvo: [], legacy: [] }

      /* How likely this PR is to reach for Arvo rather than a legacy control.
         Three things move it, and they are all real: how far along the person
         is, how far along the calendar is, and how much legacy the area still
         carries -- someone working in Pivot/Grid is surrounded by it. */
      const areaDrag = pool.legacy.length / (pool.arvo.length + pool.legacy.length || 1)
      const lean = Math.min(0.97, Math.max(0.05, dev.fluency * 0.55 + ramp * 0.5 - areaDrag * 0.25))

      /* Which components this PR actually touched. Counted, because "used
         ArvoButton once" and "used it eleven times" are different facts about
         how load-bearing a component is. */
      const arvoUsed = {}
      const legacyUsed = {}
      const touches = 1 + Math.floor(rnd() * 5)
      for (let t = 0; t < touches; t += 1) {
        if (rnd() < lean && pool.arvo.length) {
          const name = pool.arvo[Math.floor(rnd() * pool.arvo.length)]
          arvoUsed[name] = (arvoUsed[name] ?? 0) + 1 + Math.floor(rnd() * 3)
        } else if (pool.legacy.length) {
          const name = pool.legacy[Math.floor(rnd() * pool.legacy.length)]
          legacyUsed[name] = (legacyUsed[name] ?? 0) + 1 + Math.floor(rnd() * 2)
        }
      }

      /* Reaching into an internal building block. Rare, and worth surfacing:
         it is not adoption, it is coupling to something that changes without
         notice. Weighted toward people newer to the system, which is exactly
         who would not know the difference. */
      const usedInternal = rnd() < 0.05 * (1 - dev.fluency) ? (rnd() < 0.5 ? 'ArvoCalendar' : 'ArvoTimeDropdown') : null

      const openedDaysAgo = d
      /* Most merge within a few days; some sit. Nothing merges in the future. */
      const mergeLag = 1 + Math.floor(rnd() * 6)
      const isMerged = d > mergeLag
      const id = `PR-${(prNumber += 1)}`

      const pr = {
        id,
        number: prNumber,
        title: MESSAGES[i],
        repository: repo,
        team: TEAM_OF_REPO[repo],
        productArea: area,
        branch: BRANCHES[i],
        author,
        developerId: dev.id,
        openedAt: daysAgo(openedDaysAgo),
        mergedAt: isMerged ? daysAgo(openedDaysAgo - mergeLag) : '',
        status: isMerged ? 'merged' : rnd() < 0.3 ? 'draft' : 'open',
        filesChanged: 1 + Math.floor(rnd() * 14),
        arvoUsed,
        legacyUsed,
        usedInternal,
      }
      prs.push(pr)

      /* One to three pushes per PR. The scanner runs on each. */
      const pushCount = 1 + Math.floor(rnd() * 3)
      for (let p = 0; p < pushCount; p += 1) {
        const at = Math.max(0, openedDaysAgo - p)
        pushes.push({
          id: `${id}-p${p}`,
          prId: id,
          repository: repo,
          team: TEAM_OF_REPO[repo],
          productArea: area,
          branch: pr.branch,
          commitId: Math.floor(rnd() * 0xfffffff).toString(16).padStart(7, '0'),
          commitMessage: pr.title,
          author,
          timestamp: daysAgo(at),
        })
      }
    })
  }
  /* Oldest first, so "the latest push" is simply the last one. */
  pushes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  return { prs, pushes }
}

const built = buildPullRequests()

export const PULL_REQUESTS = built.prs
export const PUSHES = built.pushes

/* ---- Adoption helpers ---------------------------------------------------- */

export const countOf = (used) => Object.values(used).reduce((n, v) => n + v, 0)

/**
 * What share of this PR's UI work used Arvo.
 *
 * Weighted by USES, not by distinct component names: a PR that reached for
 * ArvoButton eleven times and one legacy grid once is mostly Arvo, and counting
 * names would score it 50/50 and call that honest.
 *
 * Returns null when a PR touched no UI components at all -- a config or test
 * change has no adoption ratio, and scoring it 0% would drag every average
 * down with work that was never in scope.
 */
export function adoptionOf(pr) {
  const arvo = countOf(pr.arvoUsed)
  const legacy = countOf(pr.legacyUsed)
  const total = arvo + legacy
  return total === 0 ? null : { arvo, legacy, total, pct: Math.round((arvo / total) * 100) }
}

function buildViolations() {
  const rnd = seeded(7761)
  const rows = []
  /* Remembers where a rule has already been seen in a file, so `isRepeated` and
     `firstDetected` are real history rather than a coin toss. Repeat detection
     is the whole point of the section: the same finding recurring is a signal
     the team needs help, not that they were careless twice. */
  /* Two maps, because they answer different questions. `firstSeen` is how long
     this has been true and never moves; `lastSeen` is whether the earlier
     conversation is still fresh and moves on every sighting. One map served as
     both and quietly made the recurrence window measure age instead. */
  const firstSeen = new Map()
  const lastSeen = new Map()
  let n = 1000

  PUSHES.forEach((push) => {
    /* The push's own area, not a fresh random one. A violation has to land in
       the area the change was actually in, or the Modernization view and the
       adoption figures describe two different products. */
    const area = push.productArea
    const dev = DEVELOPER[push.author]
    /* Someone newer to the system trips more rules. That is the finding the
       developer view exists to surface -- and the reason it is framed as who
       to help rather than who to name. */
    const count = Math.floor(rnd() * (1.6 + (1 - (dev?.fluency ?? 0.5)) * 3))
    for (let k = 0; k < count; k += 1) {
      const ruleIds = AREA_RULES[area]
      const ruleId = ruleIds[Math.floor(rnd() * ruleIds.length)]
      const rule = RULES.find((r) => r.id === ruleId)
      const files = FILES[area]
      const file = files[Math.floor(rnd() * files.length)]
      const key = `${push.repository}:${file}:${ruleId}`
      const previous = lastSeen.get(key)
      const occurrences = 1 + Math.floor(rnd() * 6)

      /* RECURRING, not merely "seen at some point".
         Counting every prior sighting made 91% of open findings "repeated",
         which tells a reader nothing -- a flag that is almost always on is not a
         signal. A finding raised nine weeks ago, fixed, and tripped again today
         is a new lapse rather than an unheeded one. Three weeks is the window in
         which the earlier conversation should still be fresh. */
      const isRecurring = !!previous && new Date(push.timestamp) - new Date(previous) <= 21 * day

      /* Age drives the status: something found nine weeks ago has had time to be
         dealt with, and a wall of "New" rows dated two months back would be a
         fiction. */
      const ageDays = Math.round((TODAY.getTime() - new Date(push.timestamp).getTime()) / day)
      let status
      if (ageDays > 42) status = rnd() > 0.12 ? 'resolved' : rnd() > 0.5 ? 'accepted-exception' : 'false-positive'
      else if (ageDays > 21) status = rnd() > 0.35 ? 'resolved' : rnd() > 0.5 ? 'in-progress' : 'fix-planned'
      else if (ageDays > 7) status = rnd() > 0.55 ? 'in-progress' : rnd() > 0.4 ? 'acknowledged' : 'fix-planned'
      else status = rnd() > 0.35 ? 'new' : 'acknowledged'

      /* A settled finding needs a settling DATE, or "average time to resolve"
         cannot be computed and the analytics would have to invent it. Drawn
         between detection and today rather than at a fixed offset, so the
         distribution has a spread to average. */
      const isSettled = status === 'resolved' || status === 'accepted-exception' || status === 'false-positive'
      /* Settled a plausible LAG after detection -- one to forty-five days --
         rather than at a uniformly random point between detection and today.
         The uniform version put a two-year-old finding's resolution date as
         likely to be last week as the week it was raised, which piled every
         historical resolution up against the present and made the open-findings
         balance read as a 64% collapse over one month. */
      const lag = 1 + Math.round(rnd() * Math.min(44, Math.max(1, ageDays - 1)))
      const resolvedAt = isSettled ? daysAgo(Math.max(0, ageDays - lag)) : ''

      rows.push({
        id: `V-${n += 1}`,
        resolvedAt,
        ruleId,
        category: rule.category,
        severity: rule.severity,
        repository: push.repository,
        productArea: area,
        branch: push.branch,
        pushId: push.id,
        prId: push.prId,
        commitId: push.commitId,
        commitMessage: push.commitMessage,
        author: push.author,
        team: push.team,
        detectedAt: push.timestamp,
        file,
        line: 12 + Math.floor(rnd() * 240),
        occurrences,
        firstDetected: firstSeen.get(key) ?? push.timestamp,
        isRepeated: isRecurring,
        status,
        /* Unassigned until someone takes it. The team contact is who the Arvo
           team talks to; it is not an implicit assignment. */
        assignee: status === 'new' ? '' : TEAM[push.team].contact,
      })
      if (!firstSeen.has(key)) firstSeen.set(key, push.timestamp)
      lastSeen.set(key, push.timestamp)
    }
  })
  return rows
}

export const VIOLATIONS = buildViolations()

/* ---- Migration history --------------------------------------------------- */

/**
 * Thirteen monthly snapshots of `migrated` per area, ending at today's figure.
 *
 * The AREAS rows are a snapshot -- they say where each area IS. They cannot say
 * whether it is moving, which is the question anyone actually asks of a
 * migration board. This is the history behind that snapshot.
 *
 * It is generated BACKWARDS from the current number so the last point always
 * equals what the table shows. Generating forwards and hoping it landed on the
 * right value is how a chart ends up quietly contradicting the row above it.
 *
 * Monotonic, because a component does not un-migrate. An area that stalled
 * simply repeats its number, which is exactly how a stall should look.
 */
function buildAreaHistory() {
  const rnd = seeded(4242)
  const out = {}
  AREAS.forEach((area) => {
    const months = new Array(13)
    let value = area.migrated
    months[12] = value
    for (let m = 11; m >= 0; m -= 1) {
      /* An area that has been quiet for a month moved less. */
      const quiet = new Date(area.lastActivity) < new Date(TODAY.getTime() - 21 * day)
      const step = Math.round(rnd() * (area.total / 13) * (quiet ? 0.6 : 1.5))
      value = Math.max(0, value - step)
      months[m] = value
    }
    out[area.id] = months
  })
  return out
}

/** { areaId: number[13] } -- oldest month first, last entry is today. */
export const AREA_HISTORY = buildAreaHistory()
