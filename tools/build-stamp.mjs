/**
 * Is the committed bundle built from the committed source?
 *
 * `dist/` is in git so that anyone can clone this and run it with no Node, no
 * npm and no feed credential. The cost of that is a bundle which can silently
 * fall behind the source it came from -- you change a view, forget to rebuild,
 * push, and the deployed app is the previous one. That has happened before on
 * the sibling repository and it is invisible: the build is green, the tests
 * pass, and the screen is simply wrong.
 *
 * So the build writes a hash of the source tree into the bundle, and this
 * compares it against the source on disk.
 *
 * A HASH rather than modification times, because git does not preserve mtimes.
 * On a fresh clone every file is stamped with the checkout time, so an
 * mtime comparison is meaningless exactly where a stranger would run it.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const STAMP = 'dist/.build-stamp.json'

/* Everything the bundle is built FROM. Not tools/, not the README, not
   .gitignore -- changing those cannot change a single byte of output, and a
   check that cries wolf gets ignored, which is worse than no check. */
const SOURCES = [
  'index.html',
  'vite.config.js',
  'package.json',
  'src',
  'packages/kit/index.js',
  'packages/kit/src',
  'packages/kit/styles',
  'packages/shell/index.js',
  'packages/shell/src',
  'vendor/o9',
]

export function hashSources() {
  const hash = crypto.createHash('sha256')
  const files = []

  const add = (p) => {
    if (!fs.existsSync(p)) return
    if (fs.statSync(p).isDirectory()) {
      /* Sorted, so the hash does not depend on the order the filesystem
         happens to hand entries back. */
      fs.readdirSync(p)
        .sort()
        .forEach((e) => add(path.join(p, e)))
      return
    }
    files.push(p)
  }

  SOURCES.forEach(add)
  files.sort().forEach((f) => {
    /* The path goes in as well as the contents: renaming a file changes the
       build, and hashing contents alone would not notice. */
    hash.update(f)
    hash.update(fs.readFileSync(f))
  })

  return { hash: hash.digest('hex'), count: files.length }
}
