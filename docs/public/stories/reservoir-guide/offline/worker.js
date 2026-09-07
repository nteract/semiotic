"use strict";
(() => {
  // docs/src/pages/examples/reservoir-guide/offline-document.ts
  var UNAVAILABLE_HTML = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Saved reservoir edition unavailable</title><body style="max-width:40rem;margin:3rem auto;padding:1rem;font:20px/1.6 system-ui"><main><h1>This reservoir edition was not saved</h1><p>This address has no saved selection on this browser. Reconnect and explicitly save a view from the online guide, or open your downloaded HTML file.</p><a href="/examples/reservoir-guide">Open the online reservoir guide</a></main></body></html>';

  // docs/src/pages/examples/reservoir-guide/offline-worker.ts
  var CACHE = "e03-saved-editions-v1";
  var PATH = "/stories/reservoir-guide/offline/";
  self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
  self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    if (event.request.mode !== "navigate" || url.origin !== self.location.origin || url.pathname !== PATH)
      return;
    event.respondWith(
      (async () => {
        const saved = await (await caches.open(CACHE)).match(event.request.url);
        return saved ?? new Response(UNAVAILABLE_HTML, {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      })()
    );
  });
})();
