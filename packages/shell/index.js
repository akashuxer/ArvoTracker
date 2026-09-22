/**
 * @o9qa/shell -- the application frame.
 *
 * The chrome every utility sits inside: the rail, the header and its
 * breadcrumb, the tool launchbar, user settings, notifications, and the hub
 * itself. A tool supplies its screens; the shell supplies everything around
 * them, so nine utilities feel like one product.
 *
 * It is host-agnostic on purpose. The shell does not know which tools exist
 * -- the host passes its catalogue and the open tool's rail as props. That
 * is what lets a different hub, in a different repository and on a different
 * backend, render the same frame.
 *
 *   import { AppHeader, LeftNav, RightLaunchbar, HubView } from '@o9qa/shell'
 *   import '@o9qa/kit/styles'
 */

export { default as AppHeader } from './src/Header.jsx'
export { default as LeftNav } from './src/LeftNav.jsx'
export { default as RightLaunchbar, PANELS } from './src/RightLaunchbar.jsx'
export { default as SettingsPanel } from './src/SettingsPanel.jsx'
export { default as NotificationList } from './src/NotificationList.jsx'

/** The tool chooser. Give it a catalogue; it renders the cards. */
export { default as HubView } from './src/HubView.jsx'

/* Providers. Both belong to the frame rather than to any one tool: a theme
   applies everywhere, and a notification has to outlive the screen that
   raised it. */
export { SettingsProvider, useSettings, THEMES, SEPARATORS } from './src/settings.jsx'
export { NotificationsProvider, useNotifications } from './src/notifications.jsx'

/** Works around an ArvoPopover bug in 3.1.2: it teleports to 0,0 on close. */
export { default as keepPopoverInPlace } from './src/keepPopoverInPlace.js'
