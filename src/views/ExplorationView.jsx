import { ExpandableTile } from '@o9qa/kit'
import ExplorationDocs from './ExplorationDocs'
import { ALERTS } from '../components/platformAlerts'

/**
 * Exploration -- ideas being looked at before anyone commits to them.
 *
 * The first one: what happens when more than one platform alert is live at once.
 * Today a single banner shows and the rest wait behind a "1/10" pager, so a
 * reader sees one problem at a time. Here the banners of every severity stack
 * above the application header, and Previous / Next still walks the whole
 * sequence as one list.
 *
 * The stack itself is mounted by the shell (see App.jsx), because a platform
 * notification belongs above the chrome, not inside a page. This view is the
 * explanation, and the way back after dismissing.
 */
export default function ExplorationView() {
  return (
    <ExpandableTile
      id="stacked-banners"
      title="Concurrent alerts, stacked above the header"
      note={`${ALERTS.length} alerts, one sequence`}
      canExpand={false}
      expandedId={null}
      onToggle={() => {}}
    >
      <ExplorationDocs />
    </ExpandableTile>
  )
}
