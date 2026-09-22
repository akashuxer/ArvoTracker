import { useEffect, useRef, useState } from 'react'
import { ArvoButton, ArvoPanel, ArvoToastProvider, TooltipProvider } from '@arvo/react'
import {
  AppHeader, LeftNav, RightLaunchbar, SettingsPanel, PANELS,
  SettingsProvider, NotificationsProvider, keepPopoverInPlace,
} from '@o9qa/shell'
import { TrackerProvider, useTracker } from './data/store'
import RoadmapView from './views/RoadmapView'
import ModernizationView from './views/ModernizationView'
import AdoptionView from './views/AdoptionView'
import ViolationsView from './views/ViolationsView'
import AnalyticsView from './views/AnalyticsView'
import WorkItemPanel from './components/WorkItemPanel'
import ImportScanPanel from './components/ImportScanPanel'

/**
 * Arvo Roadmap.
 *
 * Mounted at /arvotracker on its own Vite server. It renders on the shared
 * @o9qa chrome and kit -- which is what those packages are for -- and owns
 * nothing else: no backend, no server, no build step beyond Vite.
 *
 * Five sections, and they are not five apps. Roadmap, Modernization, Adoption
 * and Violations are four views of the same programme of work, and each links
 * into the others: a blocked migration names the roadmap item blocking it, a
 * violation names the rule and the roadmap item that would remove the whole
 * class of it, a developer's panel says which of their findings are the design
 * system's to answer rather than theirs. Analytics summarises all four.
 *
 * Adoption and Violations are deliberately the same data seen twice. One says
 * what went right and one says what went wrong, and a design system team that
 * only ever looks at the second becomes a team nobody wants to hear from.
 */
const BASE = '/arvotracker'

const SECTIONS = [
  {
    id: 'roadmap',
    label: 'Roadmap',
    /* Verified o9con names only -- an invented one renders an empty box and
       nothing errors, so they are never guessed. */
    icon: 'clipboard',
    title: 'Roadmap',
    lede: 'Every Arvo work item in one place: requests, bugs, enhancements and what is coming.',
    /* Filtered views of ONE data source, never separate datasets. An item whose
       type changes must not have to be moved between collections, and a tab
       count must not be able to disagree with the table it heads. */
    tabs: [
      { id: 'all', label: 'All' },
      { id: 'new-request', label: 'New Requests' },
      { id: 'bug', label: 'Bugs' },
      { id: 'enhancement', label: 'Enhancements' },
      { id: 'upcoming', label: 'Upcoming Items' },
    ],
  },
  {
    id: 'modernization',
    label: 'Modernization',
    icon: 'repeat',
    title: 'Modernization',
    lede: 'How far each product area has moved onto Arvo, and what is holding the rest.',
  },
  {
    id: 'adoption',
    label: 'Adoption',
    icon: 'trend-up',
    title: 'Adoption',
    lede: 'What people are actually building with — by pull request, by developer, by component.',
    /* Three questions about ONE set of pull requests, not three datasets. */
    tabs: [
      { id: 'prs', label: 'Pull requests' },
      { id: 'developers', label: 'Developers' },
      { id: 'components', label: 'Components' },
    ],
  },
  {
    id: 'violations',
    label: 'Violations',
    icon: 'exclamation-triangle',
    title: 'Violations',
    lede: 'What the scanner found on each push, and who to talk to about it.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'bar-chart',
    title: 'Analytics',
    lede: 'How everything is moving, month over month.',
  },
]

const SECTION = Object.fromEntries(SECTIONS.map((s) => [s.id, s]))
const DEFAULT_SECTION = 'roadmap'

const sectionFromPath = () => {
  const id = window.location.pathname.replace(/^\/arvotracker\/?/, '').split('/')[0]
  return SECTION[id] ? id : DEFAULT_SECTION
}

const VIEWS = {
  roadmap: RoadmapView,
  modernization: ModernizationView,
  adoption: AdoptionView,
  violations: ViolationsView,
  analytics: AnalyticsView,
}

function Shell() {
  const [section, setSection] = useState(sectionFromPath)
  const [activePanel, setActivePanel] = useState(null)
  /* null = closed, 'new' = create, an item = edit. One panel serves all three,
     because the fields and the rules are identical and two forms would be two
     things to keep in step for no gain. */
  const [editing, setEditing] = useState(null)
  const [isImporting, setImporting] = useState(false)
  /* The sub-view OF THE CURRENT SECTION, which is why it resets when the
     section changes rather than persisting a tab that no longer exists. */
  const [subTab, setSubTab] = useState(SECTION[sectionFromPath()]?.tabs?.[0]?.id ?? null)
  const { status, error, reload, saveWorkItem, nextWorkItemId } = useTracker()

  // See keepPopoverInPlace: an Arvo popover loses its position while closing.
  useEffect(keepPopoverInPlace, [])

  /* The app's address is /arvotracker/<section>. A bare /arvotracker is
     rewritten rather than redirected: no reload, and Back still leaves the app
     instead of bouncing between the two spellings. */
  useEffect(() => {
    if (window.location.pathname.replace(/\/$/, '') === BASE) {
      window.history.replaceState(window.history.state, '', `${BASE}/${DEFAULT_SECTION}`)
    }
  }, [])

  /* How deep into this app's own history we are. `history.length` cannot answer
     it -- that counts forward entries too -- so each push stamps its own depth
     and popstate reads it back. The back button has to behave like the
     browser's, or it is worse than not being there. */
  const depthRef = useRef(window.history.state?.trkDepth ?? 0)
  const [canGoBack, setCanGoBack] = useState((window.history.state?.trkDepth ?? 0) > 0)

  useEffect(() => {
    const onPop = (event) => {
      depthRef.current = event.state?.trkDepth ?? 0
      setCanGoBack(depthRef.current > 0)
      setSection(sectionFromPath())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function goTo(next) {
    if (next === section) return
    setSection(next)
    depthRef.current += 1
    window.history.pushState({ trkDepth: depthRef.current }, '', `${BASE}/${next}`)
    setCanGoBack(true)
  }

  useEffect(() => {
    setSubTab(SECTION[section]?.tabs?.[0]?.id ?? null)
  }, [section])

  const current = SECTION[section]
  const View = VIEWS[section]
  const panelConfig = PANELS.find((p) => p.id === activePanel)

  /* Where you are, and what it is part of. The last step is the page itself, so
     it is not a link. */
  const trail = [
    { id: 'root', label: 'Arvo Design System' },
    { id: section, label: current.title, isCurrent: true },
  ]

  return (
    <div className="app-container">
      <LeftNav
        items={SECTIONS}
        activeId={section}
        onNavigate={(item) => goTo(item.id)}
        onHome={() => goTo(DEFAULT_SECTION)}
      />

      <div className="app-main">
        <AppHeader
          title={current.title}
          trail={trail}
          onTrailNavigate={(id) => goTo(id === 'root' ? DEFAULT_SECTION : id)}
          tabs={current.tabs ?? []}
          activeTab={subTab}
          onTabChange={setSubTab}
          canGoBack={canGoBack}
          onBack={() => window.history.back()}
          onOpenSettings={() => setActivePanel('settings')}
        />

        <div className="app-body">
          <div className="app-content">
            <main className="content-area">
              {/* One toolbar for every section rather than an Add button inside
                  each view: raising an item is the thing you always want to be
                  able to do, including from Analytics when you have just found
                  the reason to. */}
              <div className="trk-toolbar">
                <div className="trk-toolbar__text">
                  <h1 className="trk-toolbar__title">{current.title}</h1>
                  <p className="trk-toolbar__lede">{current.lede}</p>
                </div>
                <div className="trk-toolbar__actions">
                  {section === 'violations' && (
                    <ArvoButton
                      variant="secondary"
                      size="md"
                      label="Import scan results"
                      icon="cloud-upload"
                      onClick={() => setImporting(true)}
                    />
                  )}
                  <ArvoButton
                    variant="primary"
                    size="md"
                    label="Add item"
                    icon="plus"
                    onClick={() => setEditing('new')}
                  />
                </div>
              </div>

              {status === 'error' ? (
                <div className="trk-error" role="alert">
                  <p className="trk-error__msg">Could not load the tracker: {error}</p>
                  <ArvoButton variant="secondary" size="md" label="Try again" icon="refresh" onClick={reload} />
                </div>
              ) : (
                <View subTab={subTab} onEditItem={setEditing} onNavigate={goTo} />
              )}
            </main>
          </div>

          {/* Docked, and a sibling of the content and the rail, so the shell's
              own seam supplies the [panel][launchbar] gap. */}
          <div
            className={`panel-dock${activePanel ? ' panel-dock--open' : ''}`}
            inert={!activePanel || undefined}
          >
            {panelConfig && (
              <ArvoPanel
                displayMode="docked"
                placement="right"
                title={panelConfig.title}
                defaultSize={320}
                isOpen
                onClose={() => setActivePanel(null)}
              >
                {activePanel === 'settings' ? (
                  <SettingsPanel />
                ) : (
                  <div className="trk-help">
                    <h3>What this tracker is for</h3>
                    <p>
                      Three views of one programme of work. A violation is a signal that a team
                      needs support, not a citation — the fastest fix for a repeated one is usually
                      a missing token or a missing component prop, which belongs on the Roadmap.
                    </p>
                    <h3>Where the data comes from</h3>
                    <p>
                      Mock data in this version. Violations are shaped for the CI payload, which you
                      can try from <strong>Import scan results</strong> on the Violations section.
                    </p>
                  </div>
                )}
              </ArvoPanel>
            )}
          </div>

          <RightLaunchbar activePanel={activePanel} onPanelChange={setActivePanel} />
        </div>
      </div>

      <WorkItemPanel
        item={editing === 'new' ? null : editing}
        isOpen={!!editing}
        nextId={nextWorkItemId}
        onSave={(values) => {
          saveWorkItem(values)
          setEditing(null)
          /* A created item has to be somewhere you can see it. Saving from
             Analytics and staying there looks like nothing happened. */
          goTo('roadmap')
        }}
        onCancel={() => setEditing(null)}
      />

      <ImportScanPanel isOpen={isImporting} onClose={() => setImporting(false)} />
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <ArvoToastProvider position="top-right">
        {/* The bell has nothing to watch in this app yet. The provider is still
            here because AppHeader reads the unread count, and `sources: []`
            leaves it quiet rather than erroring -- which is exactly the
            behaviour the shell documents for a host with nothing to poll. */}
        <NotificationsProvider sources={[]}>
          {/* Arvo ships tooltips DISABLED by default -- a host app must opt in.
              Without `enabled: true` the aria-label is still set, so screen
              readers are fine, but nothing appears on hover. */}
          <TooltipProvider config={{ enabled: true, hoverDelay: 400, gap: 4 }}>
            <TrackerProvider>
              <Shell />
            </TrackerProvider>
          </TooltipProvider>
        </NotificationsProvider>
      </ArvoToastProvider>
    </SettingsProvider>
  )
}
