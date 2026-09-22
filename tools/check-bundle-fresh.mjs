/**
 * Fail if the committed bundle was built from different source.
 *
 *     node tools/check-bundle-fresh.mjs
 *
 * Run this before you push. `dist/` is committed so that a clone runs with no
 * credentials, which means a change that is not rebuilt reaches nobody -- and
 * does so silently. The build is green, the tests pass, and the deployed screen
 * is the previous one.
 */
import fs from 'node:fs'
import { STAMP, hashSources } from './build-stamp.mjs'

if (!fs.existsSync(STAMP)) {
  console.error('check-bundle-fresh: no build stamp. Run `npm run build`.')
  process.exit(1)
}

const stamped = JSON.parse(fs.readFileSync(STAMP, 'utf8'))
const current = hashSources()

if (stamped.hash !== current.hash) {
  console.error(
    'check-bundle-fresh: the committed bundle does not match the source.\n' +
      `  bundle built from : ${stamped.hash.slice(0, 12)} (${stamped.count} files, ${stamped.builtAt})\n` +
      `  source on disk is : ${current.hash.slice(0, 12)} (${current.count} files)\n\n` +
      '  Run `npm run build` and commit dist/ along with your change.\n' +
      '  dist/ is in git so a clone needs no npm and no feed token; the cost is\n' +
      '  that a change which is not rebuilt reaches nobody.'
  )
  process.exit(1)
}

console.log(`check-bundle-fresh: bundle matches source (${current.count} files)`)
