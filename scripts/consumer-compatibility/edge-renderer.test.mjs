import assert from "node:assert/strict"
import test from "node:test"
import { checkEdgeRenderer } from "./edge-renderer.ts"

test("an importable edge namespace with a broken runtime dependency fails when called", async () => {
  const namespace =
    await import("data:text/javascript,export function renderChartWithEvidence() { return missingSvgSerializer() }")
  assert.equal(typeof namespace.renderChartWithEvidence, "function")
  await assert.rejects(checkEdgeRenderer(namespace, {}), /missingSvgSerializer/)
})
