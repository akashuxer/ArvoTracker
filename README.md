# Arvo Roadmap

An internal tracker for design-system work, platform modernization and Arvo
implementation violations.

Four sections — **Roadmap**, **Modernization**, **Violations**, **Analytics** —
over one set of data. Built on the o9 Design System (Arvo) and the shared
`@o9qa` component layer.

## Running it

```bash
npm install
npm run dev
```

Then open **http://localhost:3000/arvotracker** (the bare path redirects; `/`
works too).

### One-time setup: the Arvo feed

`npm install` needs a credential. `@arvo/react` and friends are published to
o9's private Azure Artifacts feed, not to public npm. The repo's `.npmrc` points
the `@arvo` scope at that feed and deliberately carries **no token**.

1. **Create a PAT.** Azure DevOps → avatar (top right) → *Personal access
   tokens* → *New Token* → organization `o9git` → scope **Packaging: Read** →
   Create. Copy it.

2. **Base64-encode it.** Azure Artifacts wants it encoded, not raw:

   ```bash
   printf %s "PASTE_YOUR_PAT" | base64
   ```

3. **Put it in your USER `~/.npmrc`** — never in this repository's.

   ```
   ; begin auth token
   //pkgs.dev.azure.com/o9git/_packaging/o9UI/npm/registry/:username=o9git
   //pkgs.dev.azure.com/o9git/_packaging/o9UI/npm/registry/:_password=[BASE64_PAT]
   //pkgs.dev.azure.com/o9git/_packaging/o9UI/npm/registry/:email=any@any.com
   //pkgs.dev.azure.com/o9git/_packaging/o9UI/npm/registry/:always-auth=true
   //pkgs.dev.azure.com/o9git/_packaging/o9UI/npm/:username=o9git
   //pkgs.dev.azure.com/o9git/_packaging/o9UI/npm/:_password=[BASE64_PAT]
   //pkgs.dev.azure.com/o9git/_packaging/o9UI/npm/:email=any@any.com
   //pkgs.dev.azure.com/o9git/_packaging/o9UI/npm/:always-auth=true
   ; end auth token
   ```

   Both URL variants are needed — npm uses one for metadata and the other for
   tarballs, and having only one produces a confusing partial failure.

| Symptom | Cause |
|---|---|
| `npm error code E401` | No token, a raw PAT instead of base64, or only one URL variant. PATs also expire. |
| `E404` on `@arvo/*` | The scope line is missing, so npm looked on public npm, where Arvo does not exist. |
| Text renders in Times New Roman, icons are empty boxes | The install did not complete. `@arvo/assets` supplies o9Sans and o9con. |

There is no workaround. Arvo is private, and a clone carries no entitlement.

## Layout

```
src/                 this app
  views/             the four sections
  components/        drawers, the create/edit form, the Kanban board, marks
  data/              enums, the Arvo rule registry, mock data, the store
  styles/            this app's own CSS layer, every class prefixed trk-
packages/kit/        @o9qa/kit   — tables, KPIs, charts, filters, the rules
packages/shell/      @o9qa/shell — rail, header, breadcrumb, launchbar, settings
vendor/o9/           Arvo's generated static-token CSS
tools/               the import checker
```

The two `@o9qa` packages are npm workspaces, so the app consumes them through
their package entry points exactly as an outside repository would after
`npm install @o9qa/kit` — no aliases, no relative paths into them. The app is a
real consumer, which is what stops the packages and the app drifting apart.

This app writes no chrome of its own. The rail, header, breadcrumb, launchbar,
settings panel, tables, KPI cells, charts, expandable tiles and confirm dialogs
are all shared components:

```js
import { DataTable, KpiCell, Chart, ExpandableTile } from '@o9qa/kit'
import { AppHeader, LeftNav, RightLaunchbar } from '@o9qa/shell'
import { ArvoButton, ArvoSelect, ArvoPanel } from '@arvo/react'
```

### The vendored shared layer

`packages/kit` and `packages/shell` are a **copy**. The canonical versions live
in the QA Utility Hub repository, where they are also used by the o9 Performance
Utility.

Both copies are marked `"private": true` and their `publishConfig` is removed, so
neither can be published over the real package on the o9UI feed. Publishing
belongs to the source repository.

That copy is the one real cost of this repo standing alone: a fix made to the
canonical kit does not reach here by itself. The intended end state is to publish
`@o9qa/kit` and `@o9qa/shell` to the o9UI feed from their source repo, and then
this repo becomes an ordinary consumer:

```jsonc
// package.json — delete the "workspaces" block and packages/, then:
"@o9qa/kit":   "^0.1.0",
"@o9qa/shell": "^0.1.0"
```

Nothing in `src/` changes, because nothing in `src/` imports them by path.

### Updating Arvo

Bump the four `@arvo/*` versions in `package.json` together and reinstall.

`vendor/o9/o9-foundation.css` is **generated output**, not a source file. It
carries Arvo's static tokens (spacing, radius, icon size, motion), which are
SCSS-only in `@arvo/tokens` and so absent from the published `arvo.css`.
Regenerating it needs the SCSS sources from the Arvo monorepo, not just the
package — re-run that repo's asset sync and copy the result here. Never
hand-edit it.

## The four sections

| | |
|---|---|
| **Roadmap** | Every work item: new requests, bugs, enhancements, upcoming. Table and Kanban, item-detail drawer, create/edit form. |
| **Modernization** | How far each product area has migrated, and what is holding the rest. |
| **Violations** | What the scanner found on each push, and who to talk to about it. |
| **Analytics** | Nine charts plus a per-team summary. |

The five Roadmap tabs are **filtered views of one array**, never separate
datasets. An item whose type changes does not have to be moved between
collections, and a tab count cannot disagree with the table beneath it.

## The framing, which is the point

A violation here is a signal that a team needs support, not a citation.

- **The author is recorded but never aggregated.** Someone has to be asked, so
  the author is on the violation and in its detail drawer. Nothing in Analytics
  counts, ranks or charts by person — the units are teams, repositories, product
  areas and rules. This is a deliberate refusal: a leaderboard of who tripped the
  most rules makes people avoid the scanner, and the scanner only works if people
  want it to run.
- **A repeated finding is a prompt, not a mark.** "Repeated" means the same rule
  tripped in the same file again within three weeks — usually because the
  guidance did not land, or because Arvo is missing a token, a prop or a pattern.
  Every violation links to its rule, and a rule links to the roadmap item that
  would remove the whole class of it.
- **"Blocked" is not "behind".** Pivot/Grid is last on the Modernization board
  because eight of its components have nowhere to go until Arvo ships a
  virtualised table pattern. The column that explains a number sits next to it.
- **Accepted exception and false positive both settle a finding.** An exception
  is a decision a team argued and won; a false positive is Arvo's bug, not
  theirs. Neither leaves a team looking like it owes work.

## Data

Mock, in memory, deterministic — a seeded generator, so two people looking at the
same screen see the same dashboard and a screenshot stays true. `TODAY` is
anchored rather than `new Date()`, for the same reason.

```
src/data/enums.js    the vocabularies every section agrees on
src/data/rules.js    the Arvo rule registry: why / alternative / fix / docs
src/data/mock.js     teams, work items, product areas, pushes, violations
src/data/store.jsx   the provider — the only file a real backend changes
```

Views never import the fixtures directly. They go through `useTracker()`, which
exposes `status` (`loading` / `ready` / `error`) alongside the data, so every
screen already treats the data as something that can be absent, slow or wrong.
Swapping in a real fetch is a change to `load` in `store.jsx` and nothing else.

The rule registry is the single source for why a finding counts and what to do
about it — a violation row carries only a `ruleId`. That is what lets an
explanation be improved once and reach every past finding.

### Importing a scan

**Violations → Import scan results** accepts the payload a CI run produces, which
is the seam the pipeline will post to. One push, many findings — not a flat list,
because repeat detection and the "latest push" count both need the push to be a
thing.

```json
{
  "repository": "platform-dashboard",
  "branch": "feature/new-kpi",
  "commitId": "a72f9c1",
  "commitMessage": "Add inventory KPI cards",
  "author": "Developer name",
  "team": "dashboard",
  "timestamp": "2026-09-22T10:30:00Z",
  "violations": [
    {
      "ruleId": "ARVO-COLOR-001",
      "productArea": "dashboard",
      "file": "src/components/InventoryKPI.tsx",
      "line": 48,
      "message": "Use an Arvo semantic color token instead of #FF0000."
    }
  ]
}
```

Two things the importer does on purpose:

- **An unknown `ruleId` refuses the whole import** rather than applying part of
  it. A finding with no rule behind it cannot tell a team what to do.
- **Category and severity come from the rule, not the payload.** A scanner that
  disagrees is out of date, and taking its word would let two rows of the same
  rule report different severities.

Intended sources, all the same shape: CI/CD, push and pull-request checks,
ESLint/custom Arvo lint rules, static analysis, accessibility testing,
design-token validation, component-import analysis.

## Design rules this app follows

The same ones it asks other teams to follow — a tracker that violates them has no
standing.

- **Colour.** Interface state (severity badges, statuses, overdue dates) uses the
  Arvo **semantic** palette. Data marks (charts, migration bars, severity glyphs)
  use **ArvoVisualPalette** via the `--arvo-viz-*` variables. They are never
  mixed and no hex is hard-coded.
- **Never colour alone.** Severity carries a glyph and a word; migration bands are
  named in the bar's accessible label and in a legend; an overdue date says
  "overdue".
- **Contrast.** The severity ramp stops at `red.base` rather than running on to
  `red.soft`, which is about 2.1:1 on the white tile — below the 3:1 a filled
  graphical object needs. That is ARVO-A11Y-002, one of this app's own rules.
- **No component overrides.** The filter row narrows its selects by setting
  `--arvo-form-input-width`, the documented variable, not by styling
  `.arvo-sel__input`. That would be ARVO-COMP-002.
- **Only verified names.** Every o9con icon name and every token is one that is
  known to exist. Neither errors when wrong — an unknown icon renders an empty
  box, an unknown token silently falls back — so neither is guessed.
- **Keyboard.** Kanban cards and table links are real `<button>`s, not divs with
  click handlers.
- **Square.** `--arvo-radius-none` throughout.
- **Highcharts only.** Charts go through `<Chart>` from the kit. Never Chart.js,
  Plotly, D3, ApexCharts or ECharts.

Styles live in `src/styles/tracker.css`, every class prefixed `trk-`. A CSS
module would scope automatically, but these rules sit on the same elements as the
kit's global classes (`.report-tile`, `.data-table__num`, `.link-cell`), which
reads better as one flat namespace. The prefix is what makes a collision
impossible.

## Before you push

```bash
npm run build:verify
```

`vite build` on its own is **not** evidence — Rollup leaves an unresolved
identifier alone, the bundle builds clean, and the screen throws at runtime.
`build:verify` runs `tools/check-imports.mjs` first, which walks every JSX tag
and hook call and fails if one resolves to nothing.

## Not built, deliberately

- **No drag-and-drop on the Kanban board.** A status change is a decision that
  wants a reason recorded against it, and a drag records nothing. Moving an item
  goes through the edit form, which appends to its decision history.
- **No persistence.** Everything resets on reload. This is a prototype for
  agreeing the shape, not a system of record.
- **No auth, no backend, no real scanner.**
