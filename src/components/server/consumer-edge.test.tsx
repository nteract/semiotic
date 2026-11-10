import assert from "node:assert/strict"
import { test } from "vitest"
import { checkEdgeRenderer } from "../../../scripts/consumer-compatibility/edge-renderer"
import * as edge from "../semiotic-server-edge"
import { resolveReferenceGeography } from "../geo/referenceGeography"

// Test the probe's rejection paths against real render output. The matrix then
// runs the same probe against each bundler's browser build of the packed entry.
function run(
  renderer: Parameters<typeof checkEdgeRenderer>[0] = edge,
  geo: Parameters<typeof checkEdgeRenderer>[1] = { resolveReferenceGeography }
) {
  return checkEdgeRenderer(renderer, geo)
}

test("edge probe verifies precision, custom chrome, local features and async reference loading", async () => {
  const result = await run()
  assert.equal(result.entry, "semiotic/server/edge")
  assert.equal(result.precision.markCount, 1)
  assert.equal(result.customChrome.annotationCount, 2)
  assert.equal(result.localGeography.features, 2)
  assert.ok(result.referenceGeography.features > 100)
  assert.equal(result.referenceGeography.rejectsUnresolved, true)
})

type Result = ReturnType<typeof edge.renderChartWithEvidence>
const mutations: [string, (result: Result) => Result, RegExp][] = [
  [
    "marks absent despite positive evidence",
    (result) => ({
      ...result,
      svg: result.svg.replace(/<path\b[^>]*(?:\/>|>[\s\S]*?<\/path>)/g, "")
    }),
    /SVG data paths/
  ],
  [
    "malformed SVG",
    (result) => ({ ...result, svg: "<svg><path>" }),
    /invalid SVG/
  ],
  [
    "custom annotation lost",
    (result) => ({
      ...result,
      svg: result.svg.replace("Reviewed 1.23456789", "lost")
    }),
    /custom React annotation/
  ],
  [
    "custom legend lost",
    (result) => ({
      ...result,
      svg: result.svg.replace("Reviewed series", "lost")
    }),
    /custom React legend/
  ],
  [
    "incorrect domain",
    (result) => ({
      ...result,
      evidence: { ...result.evidence, yDomain: [0, 1] }
    }),
    /expected domain/
  ],
  [
    "renderer warnings",
    (result) => ({
      ...result,
      evidence: { ...result.evidence, warnings: ["UNRENDERED_ANNOTATIONS"] }
    }),
    /UNRENDERED_ANNOTATIONS/
  ]
]
for (const [name, mutate, message] of mutations) {
  test(`edge probe rejects ${name}`, async () => {
    await assert.rejects(
      run({
        renderChartWithEvidence: (...args) =>
          mutate(edge.renderChartWithEvidence(...args))
      }),
      message
    )
  })
}

test("edge probe rejects ignored precision even when rendering succeeds", async () => {
  await assert.rejects(
    run({
      renderChartWithEvidence: (component, props) =>
        edge.renderChartWithEvidence(component, props)
    }),
    /precision must round/
  )
})

test("async geography loader failure is fatal after local SVG rendering succeeds", async () => {
  await assert.rejects(
    run(edge, {
      resolveReferenceGeography: async () => {
        throw new Error("world-atlas chunk failed")
      }
    }),
    /world-atlas chunk failed/
  )
})
