/**
 * Trim the built output.
 *
 *     node tools/postbuild.mjs
 *
 * Two jobs, both of which have to happen after Vite has finished.
 *
 * 1. DROP THE CJK FONTS.
 *
 *    @arvo/assets ships Noto Sans SC/TC/JP/KR as the fallback in
 *    `--o9-font-family: o9Sans, NotoSans, Arial`. Vite sees the @font-face
 *    rules, emits every file, and the build comes out at ~147 MB -- of which
 *    ~140 MB is CJK. That is slow to upload, slow to deploy, and pure ballast
 *    for an English-language internal tool.
 *
 *    The tradeoff, stated plainly: the @font-face rules in the CSS still point
 *    at these files. A browser only requests a font when it needs a glyph in
 *    that font's unicode-range, so nothing fetches them while the UI is in a
 *    Latin script -- but if this app is ever localised into Chinese, Japanese
 *    or Korean, those requests will 404 and the text will fall back to a system
 *    font. At that point, stop pruning rather than working around it.
 *
 * 2. REMOVE STALE TOP-LEVEL OUTPUT.
 *
 *    `emptyOutDir` only clears the directory Vite writes to, which is
 *    `dist/arvotracker`. Anything left in `dist` from an earlier build with a
 *    different outDir survives forever and gets deployed alongside the real
 *    thing -- a second, older copy of the app answering on the same host.
 */
import fs from 'node:fs'
import path from 'node:path'

const DIST = 'dist'
const KEEP = 'arvotracker'

/* Matched on the family name rather than the extension: the Latin Noto faces
   are small and are the actual fallback, so only the CJK ones go. */
const CJK = /Noto(Sans|Serif)(SC|TC|JP|KR|HK)[-.]/i

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`

if (!fs.existsSync(DIST)) {
  console.error('postbuild: no dist/ -- run the build first')
  process.exit(1)
}

/* ---- 1. Stale top-level entries ----------------------------------------- */

let stale = 0
for (const entry of fs.readdirSync(DIST)) {
  if (entry === KEEP) continue
  const p = path.join(DIST, entry)
  stale += sizeOf(p)
  fs.rmSync(p, { recursive: true, force: true })
  console.log(`postbuild: removed stale ${p}`)
}

/* ---- 2. CJK fonts -------------------------------------------------------- */

let pruned = 0
let count = 0
walk(path.join(DIST, KEEP), (file) => {
  if (!CJK.test(path.basename(file))) return
  pruned += fs.statSync(file).size
  fs.rmSync(file)
  count += 1
})

const total = sizeOf(DIST)
console.log(
  `postbuild: pruned ${count} CJK font files (${mb(pruned)})` +
    (stale ? `, ${mb(stale)} of stale output` : '') +
    ` -- dist is now ${mb(total)}`
)

/* A build that quietly stops pruning is a build that quietly gets 20x bigger,
   and nobody notices until a deploy times out. */
if (total > 40 * 1048576) {
  console.error(`postbuild: dist is ${mb(total)}, which is far larger than expected.`)
  process.exit(1)
}

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry)
    if (fs.statSync(p).isDirectory()) walk(p, fn)
    else fn(p)
  }
}

function sizeOf(p) {
  if (!fs.existsSync(p)) return 0
  const st = fs.statSync(p)
  if (!st.isDirectory()) return st.size
  return fs.readdirSync(p).reduce((n, e) => n + sizeOf(path.join(p, e)), 0)
}
