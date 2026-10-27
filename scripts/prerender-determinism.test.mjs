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
    const routes = [
      "",
      "artifacts/overview",
      "intelligence/serialization",
      "server/studio",
      // Network hydration reads the existing frame by ID. The prerender DOM
      // shim must support that lookup even though no mounted frame exists.
      "frames/network-frame",
      "charts/force-directed-graph",
      "charts/tree-diagram",
      "recipes/network-explorer",
      "custom-charts/custom-layouts",
      "examples/network-visualization",
      "blog/orbit-diagram",
    ]

    for (const route of routes) {
      const first = sanitizeRouteHtml(await renderRoute(route), route)
      assert.ok(
        first?.text && first.headings.length > 0,
        `Route ${route || "/"} has no readable content`,
      )
      if (route === "custom-charts/custom-layouts") {
        assert.match(first.text, /export function authoredRowAnchors/)
      }
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
