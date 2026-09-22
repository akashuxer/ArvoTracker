import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Arvo Roadmap.
 *
 * A standalone app. Everything it needs is inside this repository or comes from
 * the o9UI feed:
 *
 *   src/            this app
 *   packages/kit    @o9qa/kit   -- tables, KPIs, charts, filters, the rules
 *   packages/shell  @o9qa/shell -- rail, header, breadcrumb, launchbar, settings
 *   vendor/o9/      Arvo's generated static-token CSS
 *
 * The two @o9qa packages are npm workspaces, so the app consumes them through
 * their package entry points exactly as an outside repository would after
 * `npm install @o9qa/kit`. No aliases, no relative paths into them: the app is a
 * real consumer, which is what stops the packages and the app drifting apart.
 */

/**
 * `/arvotracker` and `/` both land on the app.
 *
 * Vite serves a based app at `/arvotracker/` and answers the bare `/arvotracker`
 * with a "did you mean" page instead of a redirect. That is the URL people will
 * type and paste, so it is sent on rather than explained.
 *
 * To serve this app at the root instead, set `base: '/'` below and delete this
 * plugin -- nothing else depends on the prefix.
 */
const landOnBase = {
  name: 'arvotracker-base-redirect',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const path = (req.url ?? '').split('?')[0]
      if (path === '/arvotracker' || path === '/') {
        res.writeHead(302, { Location: '/arvotracker/' })
        res.end()
        return
      }
      next()
    })
  },
}

export default defineConfig({
  plugins: [react(), landOnBase],
  /* The app's address in both dev and build, so every asset URL and every
     pushState path agrees on one prefix. */
  base: '/arvotracker/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    /* Fail loudly rather than silently moving to 3001. An app that answers on a
       port nobody was told about looks identical to one that is down. */
    strictPort: true,
  },
})
