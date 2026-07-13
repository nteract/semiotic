import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import Ajv2020 from "ajv/dist/2020.js"
import { describe, expect, it } from "vitest"
import { CHART_CONFIGS } from "../../server/serverChartConfigs"
import { CHART_SPECS, composeProps } from "./chartSpecs"
import type { Datum } from "./datumTypes"
import { validateProps } from "./validateProps"
import {
  CHART_DEFINITION_PILOT,
  CHART_DEFINITION_PILOT_IDS,
  CHART_DEFINITION_SCHEMA_VERSION,
  createChartDefinitionWireSchema,
  generateChartDefinitionArtifacts,
  getChartDefinition,
  type WireJsonType,
} from "./chartDefinitionPilot"

const root = process.cwd()
const exampleManifest = readFileSync(
  resolve(root, "docs/src/pages/examples/examplesManifest.js"),
  "utf8",
)
const appRoutes = readFileSync(resolve(root, "docs/src/App.jsx"), "utf8")
const aiSchema = JSON.parse(readFileSync(resolve(root, "ai/schema.json"), "utf8")) as {
  tools: Array<{ function: { name: string } }>
}

const scalarFixtures: Record<string, { valid: Record<string, unknown>; invalid: Record<string, unknown> }> = {
  LineChart: {
    valid: { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y", showPoints: false },
    invalid: { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y", showPoints: "false" },
  },
  BarChart: {
    valid: { data: [{ category: "A", value: 2 }], categoryAccessor: "category", valueAccessor: "value", orientation: "horizontal" },
    invalid: { data: [{ category: "A", value: 2 }], categoryAccessor: "category", valueAccessor: "value", orientation: "diagonal" },
  },
  ForceDirectedGraph: {
    valid: { nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }], iterations: 12 },
    invalid: { nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }], iterations: "12" },
  },
  FlowMap: {
    valid: { flows: [], nodes: [], lineIdAccessor: "id" },
    invalid: { flows: [], nodes: [], lineIdAccessor: 12 },
  },
  GaltonBoardChart: {
    valid: { mode: "mechanical", bins: 12 },
    invalid: { mode: "not-a-mode", bins: 12 },
  },
  RealtimeLineChart: {
    valid: { windowMode: "sliding", strokeWidth: 2 },
    invalid: { windowMode: "not-a-window-mode", strokeWidth: 2 },
  },
  BigNumber: {
    valid: { value: 42, mode: "tile" },
    invalid: { value: "42", mode: "tile" },
  },
}

function wireTypes(type: WireJsonType | readonly WireJsonType[]): readonly WireJsonType[] {
  return typeof type === "string" ? [type] : type
}

describe("ChartDefinition pilot registry", () => {
  it("covers exactly one requested representative from every chart family", () => {
    expect(Object.keys(CHART_DEFINITION_PILOT)).toEqual([...CHART_DEFINITION_PILOT_IDS])
    expect(new Set(Object.values(CHART_DEFINITION_PILOT).map(definition => definition.chartFamily))).toEqual(
      new Set(["xy", "ordinal", "network", "geo", "physics", "realtime", "value"]),
    )
  })

  it("derives wire/runtime surfaces and capabilities from the existing chart specs", () => {
    for (const chart of CHART_DEFINITION_PILOT_IDS) {
      const definition = CHART_DEFINITION_PILOT[chart]
      const spec = CHART_SPECS[chart]

      expect(definition.schemaVersion).toBe(CHART_DEFINITION_SCHEMA_VERSION)
      expect(definition.chartKind).toBe(chart)
      expect(definition.wire.chart).toBe(chart)
      expect(definition.chartFamily).toBe(spec.category)
      expect(definition.wire.schema).toEqual(createChartDefinitionWireSchema(spec))
      expect(definition.runtime.propMetadata).toEqual(composeProps(spec))
      expect(definition.metadata.capabilities).toBe(spec.capabilities)
      expect(definition.metadata.chartSpec).toBe(chart)
      expect(definition.metadata.aiSchemaName).toBe(chart)

      for (const property of Object.values(definition.wire.schema.properties)) {
        expect(wireTypes(property.type)).not.toContain("function")
      }
    }
  })

  it("keeps function-only and explicit runtime-only props off the wire", () => {
    const line = CHART_DEFINITION_PILOT.LineChart
    expect(line.wire.schema["x-semiotic-runtime-only-props"]).toEqual(
      expect.arrayContaining(["frameProps", "onClick", "xFormat", "yFormat"]),
    )
    expect(line.wire.schema.properties.xAccessor).toMatchObject({
      type: "string",
      "x-semiotic-runtime-types": ["string", "function"],
    })
  })

  it("matches the current renderChart support boundary", () => {
    for (const chart of CHART_DEFINITION_PILOT_IDS) {
      const definition = CHART_DEFINITION_PILOT[chart]
      const registeredForRenderChart = chart in CHART_CONFIGS
      expect(definition.metadata.support.server.mode === "render-chart").toBe(registeredForRenderChart)
      expect(definition.metadata.capabilities.supportsSSR).toBe(registeredForRenderChart)
      if (definition.metadata.support.server.mode === "render-chart") {
        expect(definition.metadata.support.server.chartConfig).toBe(chart)
      }
    }
    expect(CHART_DEFINITION_PILOT.BigNumber.metadata.support.server.mode).toBe("react-ssr-only")
    expect(CHART_DEFINITION_PILOT.RealtimeLineChart.metadata.support.server.mode).toBe("unavailable")
  })

  it("links real capability modules, AI schema entries, prop docs, lifecycle records, and examples", () => {
    const aiSchemaNames = new Set(aiSchema.tools.map(tool => tool.function.name))
    for (const chart of CHART_DEFINITION_PILOT_IDS) {
      const definition = CHART_DEFINITION_PILOT[chart]
      expect(existsSync(resolve(root, definition.metadata.capabilityModule))).toBe(true)
      expect(aiSchemaNames.has(definition.metadata.aiSchemaName)).toBe(true)
      expect(definition.metadata.lifecycle).toEqual({ status: "stable" })
      expect(definition.metadata.propDocs.componentName).toBe(chart)
      expect(existsSync(resolve(root, definition.metadata.propDocs.source))).toBe(true)
      expect(appRoutes.includes(`path="${definition.metadata.propDocs.route.split("/").at(-1)}"`)).toBe(true)
      for (const example of definition.metadata.examples) {
        expect(existsSync(resolve(root, example.source))).toBe(true)
        if (example.kind === "chart-doc") {
          const routeLeaf = example.route.split("/").at(-1)
          expect(appRoutes.includes(`path="${routeLeaf}"`)).toBe(true)
        } else {
          expect(exampleManifest.includes(example.route)).toBe(true)
        }
      }
    }
  })

  it("compiles as Draft 2020-12 and agrees with runtime scalar validation", () => {
    const Constructor = (Ajv2020 as { default?: typeof Ajv2020 }).default ?? Ajv2020
    const ajv = new Constructor({ strict: false, allErrors: true, validateFormats: false })
    ajv.addKeyword({ keyword: "x-semiotic-runtime-types" })
    ajv.addKeyword({ keyword: "x-semiotic-runtime-only-props" })

    for (const chart of CHART_DEFINITION_PILOT_IDS) {
      const definition = CHART_DEFINITION_PILOT[chart]
      const fixture = scalarFixtures[chart]
      expect(fixture, `${chart} fixture`).toBeDefined()
      expect(ajv.validateSchema(definition.wire.schema), `${chart} wire schema`).toBe(true)
      const validateWire = ajv.compile(definition.wire.schema)

      expect(validateWire(fixture.valid), `${chart} accepts valid scalar form`).toBe(true)
      expect(validateProps(chart, fixture.valid as Datum).valid, `${chart} runtime accepts valid scalar form`).toBe(true)
      expect(validateWire(fixture.invalid), `${chart} rejects invalid scalar form`).toBe(false)
      expect(validateProps(chart, fixture.invalid as Datum).valid, `${chart} runtime rejects invalid scalar form`).toBe(false)
    }
  })

  it("projects a JSON-serializable artifact for future generators", () => {
    const artifacts = generateChartDefinitionArtifacts()
    expect(artifacts).toHaveLength(CHART_DEFINITION_PILOT_IDS.length)
    expect(artifacts.map(artifact => artifact.chart)).toEqual([...CHART_DEFINITION_PILOT_IDS])
    expect(JSON.parse(JSON.stringify(artifacts))).toEqual(artifacts)
    expect(getChartDefinition("LineChart")).toBe(CHART_DEFINITION_PILOT.LineChart)
    expect(getChartDefinition("not-a-chart")).toBeUndefined()
  })
})
