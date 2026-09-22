/** Hand-written: the source is JSX. Changing a prop here is a breaking change. */
import type { ReactNode } from 'react'

export interface ToolCard {
  id: string
  name: string
  description: string
  /** An o9con icon name. */
  icon: string
  /** 'ready' launches; anything else renders as a preview card. */
  status: 'ready' | 'soon' | 'later'
}

export interface TrailStep { id: string; label: string; isCurrent?: boolean }

export function AppHeader(props: {
  title: string
  trail?: TrailStep[]
  onTrailNavigate?: (id: string) => void
  tabs?: { id: string; label: string }[]
  activeTab?: string | null
  onTabChange?: (id: string) => void
  canGoBack?: boolean
  onBack?: () => void
  onNavigate?: (view: string) => void
  onOpenSettings?: () => void
}): JSX.Element

export function LeftNav(props: {
  /** The open tool's destinations. The shell does not know them. */
  items?: { id: string; icon: string; label: string; view?: string }[]
  /** The catalogue, for resolving pinned ids to cards. */
  tools?: ToolCard[]
  activeId?: string | null
  onNavigate?: (item: any) => void
  onHome?: () => void
  showDestinations?: boolean
  pinnedIds?: string[]
  onOpenTool?: (id: string) => void
  isHidden?: boolean
}): JSX.Element

export function RightLaunchbar(props: {
  isHidden?: boolean
  activePanel?: string | null
  onPanelChange: (id: string | null) => void
}): JSX.Element
export const PANELS: { id: string; icon: string; label: string; title: string }[]

export function SettingsPanel(): JSX.Element
export function NotificationList(props: { onNavigate?: (view: string) => void }): JSX.Element

export function HubView(props: {
  tools?: ToolCard[]
  status?: Record<string, { label: string; tone: string }>
  filters?: { id: string; label: string; tone: string }[]
  toolColor?: (index: number) => string | undefined
  onOpenTool?: (id: string) => void
  pinnedIds?: string[]
  onTogglePin?: (id: string) => void
}): JSX.Element

export function SettingsProvider(props: { children?: ReactNode }): JSX.Element
export function useSettings(): {
  theme: string
  separators: string
  set: (key: string, value: string) => void
}
export const THEMES: { id: string; label: string; hint?: string; ramp: string[] }[]
export const SEPARATORS: { id: string; label: string; hint?: string }[]

export function NotificationsProvider(props: { children?: ReactNode }): JSX.Element
export function useNotifications(): { unreadCount: number; items: any[] }

export default function keepPopoverInPlace(): () => void
