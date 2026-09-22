# Arvo Roadmap

An internal tracker for design-system work, platform modernization and Arvo
implementation violations.

Five sections — **Roadmap**, **Modernization**, **Adoption**, **Violations**,
**Analytics** —
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
  views/             the five sections
  components/        drawers, the create/edit form, the Kanban board, marks
  data/              enums, rules, the component catalogue, mock data, the store
  lib/               time bucketing and period-over-period comparison
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

`packages/kit` and `packages/shell` are a **copy**, kept in-tree so this repo
builds and deploys on its own. The canonical versions live in their own
repository, where several apps consume them.

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

## The five sections

| | |
|---|---|
| **Roadmap** | Every work item: new requests, bugs, enhancements, upcoming. Table and Kanban, item-detail drawer, create/edit form. |
| **Modernization** | How far each product area has migrated, and what is holding the rest. |
| **Adoption** | What people are actually building with — by pull request, by developer, by component. |
| **Violations** | What the scanner found on each push, and who to talk to about it. |
| **Analytics** | Eleven charts, month-over-month KPIs, and a per-developer summary. |

Adoption and Violations are deliberately the same data seen twice. One says what
went right and one says what went wrong, and a design system team that only ever
looks at the second becomes a team nobody wants to hear from.

The five Roadmap tabs are **filtered views of one array**, never separate
datasets. An item whose type changes does not have to be moved between
collections, and a tab count cannot disagree with the table beneath it.

## The framing, which is the point

A violation here is a signal that a team needs support, not a citation.

- **People are named, and the design works hard to keep that useful.** An
  earlier version refused to aggregate by person at all, on the grounds that a
  count of rules broken is a stick. That was overruled, for a fair reason:
  "who would benefit from an hour of help" is a real question a team-level
  average cannot answer. So the person-level views exist, and three things stop
  them becoming a leaderboard:

  - the developer chart counts **open** findings, not total-ever — total-ever
    only measures who has been on the team longest;
  - every table sorts by **adoption descending**, so it opens on who is furthest
    along rather than who is furthest behind;
  - every row carries a **trend** beside its number, because somebody at 34% and
    rising needs something different from somebody at 34% and flat, and the
    percentage alone shows them as the same person.

  The developer drawer goes further and names which of someone's findings are
  **not theirs to fix** — a rule with a roadmap item against it is the design
  system's to answer. That is the single most useful thing that panel does.
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
src/data/catalog.js  the Arvo component catalogue, and the legacy it replaces
src/data/mock.js     teams, developers, work items, areas, PRs, pushes, violations
src/data/store.jsx   the provider — the only file a real backend changes
src/lib/series.js    time bucketing and period-over-period comparison
```

Just over two years of pull requests, pushes and findings, so the M / Q / Y
switch has real history at every grain and adoption has a visible arc — it
climbs from roughly 35% to 72% across the span, which is what makes a
month-over-month view worth looking at.

### Two traps in period-over-period, both avoided

Worth knowing about, because both produce numbers that look authoritative and
are wrong.

**A partial period against a complete one.** On the 22nd of the month, comparing
22 days against 30 reported every flow measure as down 40–50% — merged PRs, Arvo
uses, findings detected, all of it. Nothing had fallen off a cliff; the month
was not over. So `toDate` cuts the previous period to the same elapsed span, and
the labels say **"vs same point last month"** rather than "vs last month",
because those are different claims.

**Flows and balances are not the same measure.** A flow accumulates within a
period (PRs merged, findings detected) and uses `toDate`. A balance is already a
point in time (how many findings are open right now) and is compared point to
point against the same day one period back. Reading a balance off the bucket
series instead compares "now" with "the end of last month", which is a real
number but not the one the label claims.

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
- **Square, including the charts.** `--arvo-radius-none` throughout. Highcharts
  12+ defaults `borderRadius` to 3px on every column *and* bar, so the shared
  chart theme has to state it — and it had only stated it for `column`, leaving
  every horizontal bar rounded. `plotOptions.series.borderRadius = 0` is the
  catch-all, because Highcharts treats `bar` as its own type rather than a
  rotated column. **This fix belongs upstream in the canonical `@o9qa/kit`** —
  see "The vendored shared layer".
- **Stacked segments are separated, not butted together.** A 2px border in the
  tile's own surface colour, on the charts and on the progress bars alike, so
  two adjacent shades of one family read as two bands rather than one block.
  The progress bars drop zero-value bands entirely, or a band that is not there
  would still draw its separator.
- **No component overrides.** The filter row narrows its selects by setting
  `--arvo-form-input-width`, the documented variable, not by styling
  `.arvo-sel__input`. That would be ARVO-COMP-002.
- **Only verified names.** Every o9con icon name and every token is one that is
  known to exist. Neither errors when wrong — an unknown icon renders an empty
  box, an unknown token silently falls back — so neither is guessed.
- **Keyboard.** Kanban cards and table links are real `<button>`s, not divs with
  click handlers.
- **Highcharts only.** Charts go through `<Chart>` from the kit. Never Chart.js,
  Plotly, D3, ApexCharts or ECharts.

Styles live in `src/styles/tracker.css`, every class prefixed `trk-`. A CSS
module would scope automatically, but these rules sit on the same elements as the
kit's global classes (`.report-tile`, `.data-table__num`, `.link-cell`), which
reads better as one flat namespace. The prefix is what makes a collision
impossible.

## Deploying to Vercel

`vercel.json` is in the repo, so importing it gives you the right defaults:
build `npm run build`, output `dist`, `/` redirects to `/arvotracker`, and any
path under it falls back to the SPA.

**One thing you must set, or the build fails with `E401`.** Vercel runs
`npm install`, which needs the private Arvo feed. Add an environment variable:

| Name | Value |
|---|---|
| `NPM_RC` | the `; begin auth token` block from "One-time setup" above, plus the `@arvo:registry=` line |

Vercel writes `NPM_RC` to `.npmrc` before installing. Set it on Production,
Preview and Development, and use a PAT with **Packaging: Read** only. PATs
expire — when a deploy that used to work starts failing on `E401`, that is why.

Two things about the build layout, because getting either wrong produces a
deploy that succeeds and serves a blank page:

- The app builds into **`dist/arvotracker`**, not `dist`, so the served tree
  matches `base: '/arvotracker/'`. Building into `dist` left the assets at
  `dist/assets/*` while `index.html` asked for `/arvotracker/assets/*`, and
  every one of them 404'd.
- To serve at the domain root instead: set `base: '/'` and `outDir: 'dist'` in
  `vite.config.js`, drop the redirect from `vercel.json`, and remove the
  `landOnBase` plugin. Nothing in `src/` depends on the prefix except
  `sectionFromPath` in `App.jsx`.

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
