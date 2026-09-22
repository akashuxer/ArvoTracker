/**
 * Fail if a file uses something it never imported or declared.
 *
 * `vite build` does NOT catch this: Rollup leaves an unresolved identifier
 * alone and the bundle builds clean, then every screen using it throws at
 * runtime. An import-rewriting script of mine once deleted 75 import lines
 * across 23 files and the build stayed green, so this check exists because
 * the build is not evidence.
 *
 *     node tools/check-imports.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOTS = ['src', 'packages/kit/src', 'packages/shell/src']

/* Anything the browser or the language supplies. */
const GLOBALS = new Set(`
window document console navigator location history localStorage sessionStorage
fetch URL URLSearchParams FormData Blob File FileReader Image Audio
setTimeout clearTimeout setInterval clearInterval requestAnimationFrame
queueMicrotask structuredClone alert confirm prompt
Math JSON Object Array String Number Boolean Date Promise Set Map WeakMap
WeakSet RegExp Error TypeError RangeError Symbol BigInt Proxy Reflect Intl
Infinity NaN undefined globalThis process
AbortController Event CustomEvent KeyboardEvent MouseEvent PopStateEvent
ResizeObserver IntersectionObserver MutationObserver DOMParser
HTMLElement Node Text Response Request Headers TextEncoder TextDecoder
React Fragment
`.split(/\s+/).filter(Boolean))

/**
 * Blank out comments and string contents so their text is not scanned.
 *
 * A scanner, not a regex. Template literals nest -- `a ${cond ? `x` : 'y'} b`
 * -- and a regex either stops at the wrong backtick or runs past the end,
 * swallowing real code. An earlier regex version of this ate a `const`
 * declaration and then reported the thing it had just deleted as undefined.
 */
function strip(src) {
  const out = new Array(src.length)
  let i = 0
  // Template-literal nesting: each entry is the brace depth of a ${ } hole.
  const holes = []
  let mode = 'code'

  while (i < src.length) {
    const c = src[i]
    const next = src[i + 1]
    const keep = (n = 1) => { for (let k = 0; k < n; k++) out[i + k] = src[i + k]; i += n }
    const blank = (n = 1) => { for (let k = 0; k < n; k++) out[i + k] = ' '; i += n }

    if (mode === 'code') {
      if (c === '/' && next === '*') { mode = 'block'; blank(2); continue }
      if (c === '/' && next === '/') { mode = 'line'; blank(2); continue }
      if (c === "'" || c === '"') { mode = c; keep(); continue }
      if (c === '`') { mode = 'tpl'; holes.push(0); keep(); continue }
      // Closing a ${ } hole returns us to the template that opened it.
      if (c === '}' && holes.length) {
        if (holes[holes.length - 1] === 0) { mode = 'tpl'; keep(); continue }
        holes[holes.length - 1] -= 1
      }
      if (c === '{' && holes.length) holes[holes.length - 1] += 1
      keep(); continue
    }
    if (mode === 'block') { if (c === '*' && next === '/') { mode = 'code'; blank(2) } else blank(); continue }
    if (mode === 'line') { if (c === '\n') { mode = 'code'; keep() } else blank(); continue }
    if (mode === "'" || mode === '"') {
      if (c === '\\') { blank(2); continue }
      if (c === mode) { mode = 'code'; keep(); continue }
      blank(); continue
    }
    // mode === 'tpl'
    if (c === '\\') { blank(2); continue }
    if (c === '`') { mode = 'code'; holes.pop(); keep(); continue }
    if (c === '$' && next === '{') { mode = 'code'; keep(2); continue }
    blank(); continue
  }
  return out.join('')
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') walk(p, out)
    } else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p)
  }
  return out
}

const problems = []

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue
  for (const file of walk(root)) {
    const raw = fs.readFileSync(file, 'utf8')
    const src = strip(raw)

    const bound = new Set(GLOBALS)

    /* Imported names, including default, namespace and aliases. */
    for (const m of raw.matchAll(/import\s+([\s\S]+?)\s+from\s+['"][^'"]+['"]/g)) {
      const clause = m[1].replace(/\bas\b/g, ' ')
      for (const n of clause.matchAll(/[A-Za-z_$][\w$]*/g)) bound.add(n[0])
    }
    /* Declarations, parameters and destructuring. */
    for (const m of src.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) bound.add(m[1])
    for (const m of src.matchAll(/\{([^{}]*)\}\s*=/g)) {
      for (const n of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) bound.add(n[0])
    }
    for (const m of src.matchAll(/(?:function\s*\w*|\))\s*\(([^)]*)\)/g)) {
      for (const n of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) bound.add(n[0])
    }
    for (const m of src.matchAll(/\(?\s*([A-Za-z_$][\w$]*)\s*\)?\s*=>/g)) bound.add(m[1])

    const missing = new Set()

    /* Every JSX component tag: <Thing> and <Thing.Sub>. Lower-case tags are
       HTML, so only capitalised ones are checked. */
    for (const m of src.matchAll(/<([A-Z][\w$]*)/g)) {
      if (!bound.has(m[1])) missing.add(m[1])
    }
    /* Every hook call -- useState() and friends. */
    for (const m of src.matchAll(/\b(use[A-Z][\w$]*)\s*\(/g)) {
      if (!bound.has(m[1])) missing.add(m[1])
    }

    if (missing.size) problems.push({ file, missing: [...missing].sort() })
  }
}

if (problems.length) {
  console.error('\nUNDEFINED IDENTIFIERS -- these build fine and crash at runtime:\n')
  for (const { file, missing } of problems) console.error(`  ${file}\n      ${missing.join(', ')}`)
  console.error(`\n${problems.length} file(s). Usually a missing or deleted import.\n`)
  process.exit(1)
}

console.log('check-imports: every JSX component and hook resolves')
