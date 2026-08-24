/** Run: npm run check:ai-surface */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { createRequire } from "node:module"
import { URL } from "node:url"
import { buildSuggestionPropContracts } from "./lib/ai-surface-suggestion-contracts.mjs"

const require = createRequire(import.meta.url)
const schema = require("../ai/schema.json")
const { componentIndexFromSchema } = require("../ai/componentMetadata.cjs")
const manifest = JSON.parse(
  readFileSync(new URL("../ai/surface-manifest.json", import.meta.url), "utf8"),
)

describe("AI surface suggestion prop contracts", () => {
  it("keeps category inventory complete, including PhysicsCustomChart", () => {
    const schemaNames = schema.tools.map((tool) => tool.function.name).sort()
    const manifestNames = new Set(Object.values(manifest.components.categories).flat())
    for (const name of schemaNames) assert.ok(manifestNames.has(name))
    for (const name of manifest.components.aiChartExportNames) assert.ok(manifestNames.has(name))
    assert.ok(manifest.components.categories.physics.includes("PhysicsCustomChart"))
  })

  it("records the exact realtime charts that require live data", () => {
    assert.deepEqual(manifest.components.requiresLiveData, [
      "RealtimeHeatmap",
      "RealtimeHistogram",
      "RealtimeLineChart",
      "RealtimeSwarmChart",
      "RealtimeWaterfallChart",
    ])
  })

  it("derives value contracts from category metadata, never a name set", () => {
    const fakeSchema = {
      tools: [{
        function: {
          name: "UninventedValueComponent",
          parameters: {
            properties: {
              label: { type: "string" },
              mode: { enum: ["compact", "hero"] },
            },
          },
        },
      }],
    }
    const contracts = buildSuggestionPropContracts(fakeSchema, {
      components: [{
        name: "UninventedValueComponent",
        category: "value",
      }],
    })

    assert.deepEqual(contracts.UninventedValueComponent, {
      componentKind: "value-component",
      commonChartProps: "component-specific",
      headingProp: "label",
      modeValues: ["compact", "hero"],
    })
  })

  it("lets generic renderers distinguish value components from chart HOCs", () => {
    const contracts = buildSuggestionPropContracts(
      schema,
      componentIndexFromSchema(schema),
    )

    assert.deepEqual(contracts.BigNumber, {
      componentKind: "value-component",
      commonChartProps: "component-specific",
      headingProp: "label",
      modeValues: ["tile", "presentation", "inline", "thumbnail"],
    })
    assert.deepEqual(contracts.LineChart, {
      componentKind: "chart-hoc",
      commonChartProps: "supported",
      headingProp: "title",
      modeValues: ["primary", "context", "sparkline", "mobile"],
    })
    assert.deepEqual(contracts.ParallelCoordinatesRecipe, {
      componentKind: "chart-recipe",
      commonChartProps: "supported",
      headingProp: "title",
      modeValues: [],
    })
  })

  it("declares a contract for every schema component", () => {
    assert.equal(
      Object.keys(manifest.components.suggestionPropContracts).length,
      manifest.components.schema,
    )
  })
})
