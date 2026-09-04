/**
 * Run: node --test scripts/prerender-determinism.test.mjs
 */
import { createHash } from "node:crypto"
import { describe, it } from "node:test"
import { setTimeout as delay } from "node:timers/promises"
import assert from "node:assert/strict"
import {
  createStaticRouteRenderer,
  sanitizeRouteHtml,
} from "./prerender.mjs"

function routeDocumentHash(document) {
  return createHash("sha256").update(JSON.stringify(document)).digest("hex")
}

describe("documentation prerender determinism", () => {
  it("emits stable machine-readable content for stateful documentation routes", async () => {
    const renderRoute = await createStaticRouteRenderer()
    const routes = ["", "artifacts/overview", "intelligence/serialization", "server/studio"]

    for (const route of routes) {
      const first = sanitizeRouteHtml(await renderRoute(route), route)
      await delay(5)
      const second = sanitizeRouteHtml(await renderRoute(route), route)

      assert.equal(
        routeDocumentHash(second),
        routeDocumentHash(first),
        `Machine-readable route ${route || "/"} changed between consecutive renders`,
      )
    }
  })
})
