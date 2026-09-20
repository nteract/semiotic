import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import Ajv2020 from "ajv/dist/2020.js"
import { describe, expect, it } from "vitest"
import { realtimeDefinitionFixtures } from "../../../test-utils/realtimeDefinitionFixtures"
import { networkDefinitionFixtures } from "../../../test-utils/networkDefinitionFixtures"
import { physicsDefinitionFixtures } from "../../../../scripts/fixtures/physics-definition-fixtures"
import { ordinalDefinitionFixtures } from "../../../test-utils/ordinalDefinitionFixtures"
import { CHART_CONFIGS } from "../../server/serverChartConfigs"
import { VALUE_RENDERERS } from "../../server/staticValue"
import { CHART_SPECS, composeProps } from "./chartSpecs"
import type { Datum } from "./datumTypes"
import { validateProps } from "./validateProps"
import { generateSchemaToolEntryFromChartDefinition } from "../../../../scripts/lib/chart-specs-generators.mjs"
import {
  CHART_DEFINITIONS,
  CHART_DEFINITION_IDS,
  CHART_DEFINITION_SCHEMA_VERSION,
  createChartDefinitionWireSchema,
  generateChartDefinitionArtifacts,
  getChartDefinition,
  type WireJsonType
} from "./chartDefinitions"

const root = process.cwd()
const exampleDefinitions = readFileSync(
  resolve(root, "docs/src/pages/examples/exampleDefinitions.js"),
  "utf8"
)
const appRoutes = readFileSync(resolve(root, "docs/src/App.jsx"), "utf8")
const aiSchema = JSON.parse(
  readFileSync(resolve(root, "ai/schema.json"), "utf8")
) as {
  tools: Array<{ function: { name: string }; type: "function" }>
}

const scalarFixtures: Record<
  string,
  { valid: Record<string, unknown>; invalid: Record<string, unknown> }
> = {
  ...Object.fromEntries(
    Object.entries({
      BumpChart: { data: [{ x: 1, y: 2 }] },
      AreaChart: { data: [{ x: 1, y: 2 }] },
      DifferenceChart: { data: [{ x: 1, y: 2 }] },
      StackedAreaChart: { data: [{ x: 1, y: 2, group: "A" }], areaBy: "group" },
      Scatterplot: { data: [{ x: 1, y: 2 }] },
      BubbleChart: { data: [{ x: 1, y: 2, size: 3 }], sizeBy: "size" },
      Heatmap: { data: [{ x: 1, y: 2, value: 3 }] },
      QuadrantChart: { data: [{ x: 1, y: 2 }] },
      MultiAxisLineChart: {
        data: [{ x: 1, y: 2 }],
        series: [{ yAccessor: "y" }]
      },
      WaterfallChart: { data: [{ category: "A", value: 2 }] },
      CandlestickChart: {
        data: [{ date: 1, open: 2, high: 4, low: 1, close: 3 }]
      },
      ConnectedScatterplot: { data: [{ x: 1, y: 2 }] },
      ScatterplotMatrix: { data: [{ x: 1, y: 2 }], fields: ["x", "y"] },
      MinimapChart: { data: [{ x: 1, y: 2 }] },
      ...ordinalDefinitionFixtures,
      ...networkDefinitionFixtures,
      ...physicsDefinitionFixtures,
      ...realtimeDefinitionFixtures
    }).map(([name, props]) => [
      name,
      {
        valid: { ...props, width: 600 },
        invalid: { ...props, width: "wide" }
      }
    ])
  ),
  LineChart: {
    valid: {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      showPoints: false
    },
    invalid: {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      showPoints: "false"
    }
  },
  BarChart: {
    valid: {
      data: [{ category: "A", value: 2 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      orientation: "horizontal"
    },
    invalid: {
      data: [{ category: "A", value: 2 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      orientation: "diagonal"
    }
  },
  ForceDirectedGraph: {
    valid: {
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ source: "a", target: "b" }],
      iterations: 12
    },
    invalid: {
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ source: "a", target: "b" }],
      iterations: "12"
    }
  },
  FlowMap: {
    valid: { flows: [], nodes: [], lineIdAccessor: "id" },
    invalid: { flows: [], nodes: [], lineIdAccessor: 12 }
  },
  GaltonBoardChart: {
    valid: { mode: "mechanical", bins: 12 },
    invalid: { mode: "not-a-mode", bins: 12 }
  },
  RealtimeLineChart: {
    valid: { windowMode: "sliding", strokeWidth: 2 },
    invalid: { windowMode: "not-a-window-mode", strokeWidth: 2 }
  },
  BigNumber: {
    valid: { value: 42, mode: "tile" },
    invalid: { value: "42", mode: "tile" }
  }
}

function wireTypes(
  type: WireJsonType | readonly WireJsonType[]
): readonly WireJsonType[] {
  return typeof type === "string" ? [type] : type
}

describe("ChartDefinition registry", () => {
  it("covers the complete XY, ordinal, network, physics, and realtime families and retains other representatives", () => {
    expect(Object.keys(CHART_DEFINITIONS)).toEqual([...CHART_DEFINITION_IDS])
    for (const family of ["xy", "ordinal", "network", "physics", "realtime"]) {
      expect(
        Object.keys(CHART_DEFINITIONS)
          .filter((name) => CHART_DEFINITIONS[name].chartFamily === family)
          .sort()
      ).toEqual(
        Object.keys(CHART_SPECS)
          .filter((name) => CHART_SPECS[name].category === family)
          .sort()
      )
    }
    expect(
      new Set(
        Object.values(CHART_DEFINITIONS).map(
          (definition) => definition.chartFamily
        )
      )
    ).toEqual(
      new Set([
        "xy",
        "ordinal",
        "network",
        "geo",
        "physics",
        "realtime",
        "value"
      ])
    )
  })

  it("derives wire/runtime surfaces and capabilities from the existing chart specs", () => {
    for (const chart of CHART_DEFINITION_IDS) {
      const definition = CHART_DEFINITIONS[chart]
      const spec = CHART_SPECS[chart]

      expect(definition.schemaVersion).toBe(CHART_DEFINITION_SCHEMA_VERSION)
      expect(definition.chartKind).toBe(chart)
      expect(definition.wire.chart).toBe(chart)
      expect(definition.chartFamily).toBe(spec.category)
      expect(definition.wire.schema).toEqual(
        createChartDefinitionWireSchema(spec)
      )
      expect(definition.runtime.propMetadata).toEqual(composeProps(spec))
      expect(definition.metadata.capabilities).toBe(spec.capabilities)
      expect(definition.metadata.chartSpec).toBe(chart)
      expect(definition.metadata.aiSchemaName).toBe(chart)
      expect(definition.metadata.importPath).toBe(spec.importPath)

      for (const property of Object.values(definition.wire.schema.properties)) {
        expect(wireTypes(property.type)).not.toContain("function")
      }
    }
  })

  it("keeps function-only and explicit runtime-only props off the wire", () => {
    const line = CHART_DEFINITIONS.LineChart
    expect(line.wire.schema["x-semiotic-runtime-only-props"]).toEqual(
      expect.arrayContaining(["frameProps", "onClick", "xFormat", "yFormat"])
    )
    expect(line.wire.schema.properties.xAccessor).toMatchObject({
      type: "string",
      "x-semiotic-runtime-types": ["string", "function"]
    })
  })

  it("matches the current renderChart support boundary", () => {
    for (const chart of CHART_DEFINITION_IDS) {
      const definition = CHART_DEFINITIONS[chart]
      const registeredForRenderChart =
        chart in CHART_CONFIGS || chart in VALUE_RENDERERS
      expect(definition.metadata.support.server.mode === "render-chart").toBe(
        registeredForRenderChart
      )
      expect(definition.metadata.capabilities.supportsSSR).toBe(
        registeredForRenderChart
      )
      if (definition.metadata.support.server.mode === "render-chart") {
        expect(definition.metadata.support.server.chartConfig).toBe(chart)
      }
    }
    expect(CHART_DEFINITIONS.BigNumber.metadata.support.server.mode).toBe(
      "render-chart"
    )
    expect(
      CHART_DEFINITIONS.RealtimeLineChart.metadata.support.server.mode
    ).toBe("render-chart")
  })

  it("links real capability modules, AI schema entries, prop docs, lifecycle records, and examples", () => {
    const aiSchemaNames = new Set(
      aiSchema.tools.map((tool) => tool.function.name)
    )
    for (const chart of CHART_DEFINITION_IDS) {
      const definition = CHART_DEFINITIONS[chart]
      expect(
        existsSync(resolve(root, definition.metadata.capabilityModule))
      ).toBe(true)
      expect(aiSchemaNames.has(definition.metadata.aiSchemaName)).toBe(true)
      expect(definition.metadata.lifecycle).toEqual({ status: "stable" })
      expect(definition.metadata.propDocs.componentName).toBe(chart)
      expect(
        existsSync(resolve(root, definition.metadata.propDocs.source))
      ).toBe(true)
      expect(
        appRoutes.includes(
          `path="${definition.metadata.propDocs.route.split("/").at(-1)}"`
        )
      ).toBe(true)
      for (const example of definition.metadata.examples) {
        expect(existsSync(resolve(root, example.source))).toBe(true)
        if (example.kind === "chart-doc") {
          const routeLeaf = example.route.split("/").at(-1)
          expect(appRoutes.includes(`path="${routeLeaf}"`)).toBe(true)
        } else {
          expect(exampleDefinitions.includes(example.route)).toBe(true)
        }
      }
    }
  })

  it("compiles as Draft 2020-12 and agrees with runtime scalar validation", () => {
    const Constructor =
      (Ajv2020 as { default?: typeof Ajv2020 }).default ?? Ajv2020
    const ajv = new Constructor({
      strict: false,
      allErrors: true,
      validateFormats: false
    })
    ajv.addKeyword({ keyword: "x-semiotic-runtime-types" })
    ajv.addKeyword({ keyword: "x-semiotic-runtime-only-props" })

    for (const chart of CHART_DEFINITION_IDS) {
      const definition = CHART_DEFINITIONS[chart]
      const fixture = scalarFixtures[chart]
      expect(fixture, `${chart} fixture`).toBeDefined()
      expect(
        ajv.validateSchema(definition.wire.schema),
        `${chart} wire schema`
      ).toBe(true)
      const validateWire = ajv.compile(definition.wire.schema)

      expect(
        validateWire(fixture.valid),
        `${chart} accepts valid scalar form`
      ).toBe(true)
      expect(
        validateProps(chart, fixture.valid as Datum).valid,
        `${chart} runtime accepts valid scalar form`
      ).toBe(true)
      expect(
        validateWire(fixture.invalid),
        `${chart} rejects invalid scalar form`
      ).toBe(false)
      expect(
        validateProps(chart, fixture.invalid as Datum).valid,
        `${chart} runtime rejects invalid scalar form`
      ).toBe(false)
    }
  })

  it("preserves authored nested constraints in definitions and artifacts", () => {
    const artifacts = generateChartDefinitionArtifacts()
    for (const chart of CHART_DEFINITION_IDS) {
      const definition = CHART_DEFINITIONS[chart]
      const artifact = artifacts.find((entry) => entry.chart === chart)!
      for (const [name, prop] of Object.entries(
        composeProps(CHART_SPECS[chart])
      )) {
        if (!prop.schema || prop.omitFromSchema) continue
        expect(
          definition.wire.schema.properties[name],
          `${chart}.${name}`
        ).toMatchObject(prop.schema)
        expect(
          artifact.wire.schema.properties[name],
          `${chart}.${name} artifact`
        ).toMatchObject(prop.schema)
      }
    }

    const Constructor =
      (Ajv2020 as { default?: typeof Ajv2020 }).default ?? Ajv2020
    const ajv = new Constructor({ strict: false })
    const validate = ajv.compile(CHART_DEFINITIONS.GaugeChart.wire.schema)
    expect(
      validate({ value: 50, thresholds: [{ value: 20, color: "red" }] })
    ).toBe(true)
    for (const thresholds of [
      [],
      [{ value: 20 }],
      [{ color: "red" }],
      [{ value: 20, color: "red", extra: true }]
    ]) {
      expect(validate({ value: 50, thresholds })).toBe(false)
    }
  })

  it("projects a JSON-serializable artifact for future generators", () => {
    const artifacts = generateChartDefinitionArtifacts()
    expect(artifacts).toHaveLength(CHART_DEFINITION_IDS.length)
    expect(artifacts.map((artifact) => artifact.chart)).toEqual([
      ...CHART_DEFINITION_IDS
    ])
    expect(JSON.parse(JSON.stringify(artifacts))).toEqual(artifacts)
    expect(getChartDefinition("LineChart")).toBe(CHART_DEFINITIONS.LineChart)
    expect(getChartDefinition("not-a-chart")).toBeUndefined()
  })

  it("generates the migrated entries in the canonical AI schema registry", () => {
    for (const chart of CHART_DEFINITION_IDS) {
      const generated = generateSchemaToolEntryFromChartDefinition(
        CHART_DEFINITIONS[chart]
      )
      const canonical = aiSchema.tools.find(
        (tool) => tool.function.name === chart
      )
      expect(generated, chart).toEqual(canonical)
    }
  })
})
