/**
 * The Arvo component catalogue.
 *
 * What the design system ships, so adoption can be measured against something
 * real rather than against whatever happens to appear in the data. A component
 * nobody imports is as interesting as one everybody does -- it is either
 * undiscovered, badly documented, or was never needed.
 *
 * `since` drives time-to-adopt: how long a component sat on the shelf before a
 * product team picked it up. That number says more about the documentation and
 * the announcement than about the component.
 */

export const COMPONENTS = [
  /* Actions */
  { name: 'ArvoButton', group: 'Actions', since: '1.0' },
  { name: 'ArvoIconButton', group: 'Actions', since: '1.0' },
  { name: 'ArvoDropdownButton', group: 'Actions', since: '2.1' },
  { name: 'ArvoBusyButton', group: 'Actions', since: '3.1' },

  /* Form */
  { name: 'ArvoTextbox', group: 'Form', since: '1.0' },
  { name: 'ArvoTextarea', group: 'Form', since: '1.0' },
  { name: 'ArvoNumberInput', group: 'Form', since: '1.2' },
  { name: 'ArvoSelect', group: 'Form', since: '1.0' },
  { name: 'ArvoCombobox', group: 'Form', since: '3.0' },
  { name: 'ArvoCheckbox', group: 'Form', since: '1.0' },
  { name: 'ArvoRadio', group: 'Form', since: '1.0' },
  { name: 'ArvoRadioGroup', group: 'Form', since: '1.0' },
  { name: 'ArvoSwitch', group: 'Form', since: '1.1' },
  { name: 'ArvoSearch', group: 'Form', since: '2.0' },
  { name: 'ArvoDatePicker', group: 'Form', since: '2.2' },
  { name: 'ArvoDateRangePicker', group: 'Form', since: '3.0' },
  { name: 'ArvoTimePicker', group: 'Form', since: '2.2' },

  /* Data */
  { name: 'ArvoTable', group: 'Data', since: '3.0' },
  { name: 'ArvoBadge', group: 'Data', since: '1.0' },
  { name: 'ArvoChip', group: 'Data', since: '1.3' },
  { name: 'ArvoAvatar', group: 'Data', since: '1.1' },

  /* Overlay */
  { name: 'ArvoPanel', group: 'Overlay', since: '2.0' },
  { name: 'ArvoPopover', group: 'Overlay', since: '2.0' },
  { name: 'ArvoAlertDialog', group: 'Overlay', since: '1.4' },
  { name: 'ArvoContextMenu', group: 'Overlay', since: '3.0' },
  { name: 'ArvoToast', group: 'Overlay', since: '2.1' },
  { name: 'ArvoTooltip', group: 'Overlay', since: '1.2' },

  /* Navigation and layout */
  { name: 'ArvoBreadcrumb', group: 'Navigation', since: '2.0' },
  { name: 'ArvoTabs', group: 'Navigation', since: '1.2' },
  { name: 'ArvoStepper', group: 'Navigation', since: '2.3' },
  { name: 'ArvoCard', group: 'Layout', since: '1.0' },
  { name: 'ArvoEmptyState', group: 'Layout', since: '2.1' },
  { name: 'ArvoAppBar', group: 'Layout', since: '2.0' },
  { name: 'ArvoRail', group: 'Layout', since: '2.0' },

  /* Deprecated. Still counted as Arvo -- it IS an Arvo component -- but flagged
     separately, because adoption of something on its way out is not progress. */
  { name: 'ArvoLegacyTable', group: 'Data', since: '1.0', isDeprecated: true, replacedBy: 'ArvoTable' },

  /* Internal building blocks. Exported so the public composing components can
     use them, but NOT part of the developer surface. Importing one directly is
     a finding, not adoption -- it couples product code to internals that change
     without notice. */
  { name: 'ArvoCalendar', group: 'Form', since: '2.2', isInternal: true, useInstead: 'ArvoDatePicker' },
  { name: 'ArvoTimeDropdown', group: 'Form', since: '2.2', isInternal: true, useInstead: 'ArvoTimePicker' },
]

export const COMPONENT = Object.fromEntries(COMPONENTS.map((c) => [c.name, c]))

export const COMPONENT_GROUPS = [...new Set(COMPONENTS.map((c) => c.group))]

/** What a product team should be reaching for: not deprecated, not internal. */
export const PUBLIC_COMPONENTS = COMPONENTS.filter((c) => !c.isInternal && !c.isDeprecated)

/**
 * Non-Arvo UI still in the product.
 *
 * Every one of these has an Arvo equivalent today. They are what the
 * Modernization section is counting down, and what drags an adoption ratio.
 */
export const LEGACY_COMPONENTS = [
  { name: 'LegacyKpiTile', useInstead: 'ArvoCard' },
  { name: 'LegacySparkline', useInstead: 'ArvoCard' },
  { name: 'LegacyPivotHeader', useInstead: 'ArvoTable' },
  { name: 'LegacyCellEditor', useInstead: 'ArvoTextbox' },
  { name: 'LegacyColumnMenu', useInstead: 'ArvoContextMenu' },
  { name: 'VirtualScroller', useInstead: 'ArvoTable' },
  { name: 'LegacyScopePicker', useInstead: 'ArvoCombobox' },
  { name: 'LegacyApprovalChain', useInstead: 'ArvoStepper' },
  { name: 'LegacyCommentThread', useInstead: 'ArvoCard' },
  { name: 'LegacyFileDrop', useInstead: '(none yet — ARV-433 territory)' },
  { name: 'LegacyPermissionTree', useInstead: 'ArvoTable' },
  { name: 'LegacyRoleMatrix', useInstead: 'ArvoTable' },
  { name: 'LegacyTenantSwitcher', useInstead: 'ArvoSelect' },
  { name: 'LegacyChartLegend', useInstead: 'ArvoChip' },
  { name: 'LegacyExportMenu', useInstead: 'ArvoDropdownButton' },
  { name: 'LegacyComparisonGrid', useInstead: 'ArvoTable' },
  { name: 'LegacyScenarioTree', useInstead: 'ArvoTable' },
]

export const LEGACY = Object.fromEntries(LEGACY_COMPONENTS.map((c) => [c.name, c]))

/** Which components plausibly appear in which product area's code. */
export const AREA_COMPONENTS = {
  dashboard: {
    arvo: ['ArvoCard', 'ArvoButton', 'ArvoSelect', 'ArvoChip', 'ArvoTooltip', 'ArvoBadge', 'ArvoIconButton'],
    legacy: ['LegacyKpiTile', 'LegacySparkline', 'ArvoLegacyTable'],
  },
  'global-nav': {
    arvo: ['ArvoAppBar', 'ArvoRail', 'ArvoBreadcrumb', 'ArvoAvatar', 'ArvoPopover', 'ArvoBadge', 'ArvoIconButton'],
    legacy: [],
  },
  notifications: {
    arvo: ['ArvoToast', 'ArvoBadge', 'ArvoPopover', 'ArvoEmptyState'],
    legacy: [],
  },
  workflow: {
    arvo: ['ArvoStepper', 'ArvoButton', 'ArvoAlertDialog', 'ArvoTextarea', 'ArvoAvatar'],
    legacy: ['LegacyApprovalChain', 'LegacyCommentThread'],
  },
  forms: {
    arvo: ['ArvoTextbox', 'ArvoTextarea', 'ArvoSelect', 'ArvoRadioGroup', 'ArvoCheckbox', 'ArvoSwitch', 'ArvoNumberInput', 'ArvoDatePicker'],
    legacy: ['LegacyFileDrop'],
  },
  scenario: {
    arvo: ['ArvoCard', 'ArvoSelect', 'ArvoChip', 'ArvoTabs', 'ArvoButton'],
    legacy: ['LegacyComparisonGrid', 'LegacyScenarioTree'],
  },
  grid: {
    arvo: ['ArvoTable', 'ArvoCheckbox', 'ArvoIconButton', 'ArvoContextMenu', 'ArvoTooltip'],
    legacy: ['LegacyPivotHeader', 'LegacyCellEditor', 'LegacyColumnMenu', 'ArvoLegacyTable', 'VirtualScroller'],
  },
  filters: {
    arvo: ['ArvoSelect', 'ArvoChip', 'ArvoSearch', 'ArvoDatePicker', 'ArvoDateRangePicker', 'ArvoCombobox'],
    legacy: ['LegacyScopePicker'],
  },
  admin: {
    arvo: ['ArvoTextbox', 'ArvoButton', 'ArvoCheckbox', 'ArvoSelect'],
    legacy: ['LegacyPermissionTree', 'LegacyRoleMatrix', 'LegacyTenantSwitcher', 'ArvoLegacyTable'],
  },
  reporting: {
    arvo: ['ArvoTable', 'ArvoSelect', 'ArvoTabs', 'ArvoCard', 'ArvoDateRangePicker', 'ArvoEmptyState'],
    legacy: ['LegacyChartLegend', 'LegacyExportMenu'],
  },
}
