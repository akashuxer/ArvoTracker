#!/usr/bin/env python3
"""Serve the committed build, with no Node, no npm and no Arvo credential.

    python3 tools/serve.py          # http://localhost:8000/arvotracker/
    python3 tools/serve.py 8080     # a different port

Why this exists rather than `python3 -m http.server --directory dist`:
that serves files and nothing else, so `/arvotracker/` works and
`/arvotracker/analytics` returns 404. This is a single-page app -- every route
below the base is the same document, and the router reads the URL once the page
is running. Refreshing any screen, or opening a link someone sent you, would
have hit that 404.

So anything under the base that is not a real file falls back to index.html,
which is the same rule `vercel.json` applies in production. One behaviour in
both places, rather than a local setup that is subtly not what ships.
"""
import functools
import http.server
import os
import socketserver
import sys

BASE = "/arvotracker"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist")
INDEX = os.path.join(ROOT, BASE.strip("/"), "index.html")


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        local = super().translate_path(path.split("?", 1)[0].split("#", 1)[0])
        # A real file, or a directory with an index: serve it as usual.
        if os.path.isfile(local) or os.path.isdir(local):
            return local
        # Anything else under the base is a client-side route.
        if path.startswith(BASE):
            return INDEX
        return local

    def end_headers(self):
        # No caching locally. Serving yesterday's bundle from the browser cache
        # is indistinguishable from forgetting to rebuild, and this script
        # exists precisely for people checking whether a change landed.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "404" in (fmt % args):
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

    if not os.path.isfile(INDEX):
        sys.exit(
            "No build found at dist/.\n"
            "The build is normally committed -- if it is missing, either the\n"
            "clone is incomplete or someone removed it. Rebuild with\n"
            "`npm install && npm run build` (that needs Node and Arvo feed\n"
            "access), or pull again."
        )

    handler = functools.partial(SpaHandler, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
        print(f"\n  Arvo Roadmap\n    http://localhost:{port}{BASE}/\n    Stop with Ctrl+C\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
