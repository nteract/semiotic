/// <reference lib="webworker" />
import { UNAVAILABLE_HTML } from "./offline-document"
export {}
declare const self: ServiceWorkerGlobalScope
const CACHE = "e03-saved-editions-v1"
const PATH = "/stories/reservoir-guide/offline/"

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()))
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (
    event.request.mode !== "navigate" ||
    url.origin !== self.location.origin ||
    url.pathname !== PATH
  )
    return
  event.respondWith(
    (async () => {
      const saved = await (await caches.open(CACHE)).match(event.request.url)
      return (
        saved ??
        new Response(UNAVAILABLE_HTML, {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        })
      )
    })(),
  )
})
