/**
 * Additive ChartDefinition pilot registry.
 *
 * This is deliberately a descriptive, pure layer: it imports chart-spec
 * metadata but never React components, frame stores, server renderers, or
 * docs modules. The implementation, server, capability, and example links
 * are strings so hosts can decide what to load. Existing registries remain
 * authoritative while this seven-chart slice proves the boundary.
 */
import {
  CHART_SPECS,
  composeProps,
  type ChartCapabilities,
  type ChartCategory,
  type ChartPropSpec,
  type ChartSpec,
  type PropType,
} from "./chartSpecs"

/** Version of the definition shape, independently from the package version. */
export const CHART_DEFINITION_SCHEMA_VERSION = 1 as const

/** Version of this intentionally small, additive pilot manifest. */
export const CHART_DEFINITION_PILOT_VERSION = "1.0.0" as const

export const CHART_DEFINITION_PILOT_IDS = [
  "LineChart",
  "BarChart",
  "ForceDirectedGraph",
  "FlowMap",
  "GaltonBoardChart",
  "RealtimeLineChart",
  "BigNumber",
] as const

export type ChartDefinitionPilotId = (typeof CHART_DEFINITION_PILOT_IDS)[number]
export type WireJsonType = Exclude<PropType, "function">

/**
 * Strictly serializable portion of a runtime prop. Function-only and
 * `omitFromSchema` props live in `runtimeOnlyProps`; mixed string/function
 * accessors retain their serializable string form and name their broader
 * runtime contract in the extension field.
 */
export interface ChartDefinitionWireProperty {
  readonly type: WireJsonType | readonly WireJsonType[]
  readonly enum?: readonly string[]
  readonly default?: unknown
  readonly description?: string
  readonly "x-semiotic-runtime-types"?: readonly PropType[]
}

export interface ChartDefinitionWireSchema {
  readonly $schema: "https://json-schema.org/draft/2020-12/schema"
  readonly type: "object"
  readonly properties: Readonly<Record<string, ChartDefinitionWireProperty>>
  readonly required: readonly string[]
  /** Runtime props deliberately absent from the serializable wire surface. */
  readonly "x-semiotic-runtime-only-props": readonly string[]
}

/** A string reference prevents the definition registry from loading React. */
export interface LazyImplementationReference {
  readonly module: string
  readonly exportName: string
}

export type ChartDefinitionServerSupport =
  | { readonly mode: "render-chart"; readonly chartConfig: string }
  | { readonly mode: "react-ssr-only"; readonly reason: string }
  | { readonly mode: "unavailable"; readonly reason: string }

/**
 * References into the current docs surface. They remain links for now: the
 * future ExampleDefinition registry will become the source of truth for them.
 */
export interface ChartDefinitionExampleReference {
  /** `chart-doc` is an interactive documentation demo pending ExampleDefinition migration. */
  readonly kind?: "example" | "chart-doc"
  readonly route: string
  readonly source: string
}

/** Explicitly additive lifecycle truth; no pilot chart is deprecated. */
export interface ChartDefinitionLifecycle {
  readonly status: "stable" | "experimental" | "deprecated" | "internal"
  readonly since?: string
  readonly deprecation?: {
    readonly since: string
    readonly replacement?: string
  }
}

/** Public docs page and the component identifier consumed by PropTable. */
export interface ChartDefinitionPropDocs {
  readonly componentName: string
  readonly route: string
  readonly source: string
}

export interface ChartDefinitionMetadata {
  readonly description: string
  /** Reused directly from ChartSpec while the existing capability registry leads. */
  readonly capabilities: ChartCapabilities
  readonly capabilityModule: string
  readonly chartSpec: string
  readonly aiSchemaName: string
  readonly lifecycle: ChartDefinitionLifecycle
  readonly propDocs: ChartDefinitionPropDocs
  readonly support: {
    readonly browser: "react"
    readonly server: ChartDefinitionServerSupport
  }
  readonly examples: readonly ChartDefinitionExampleReference[]
}

/**
 * Minimal RFC-aligned manifest shape for the pilot. `wire` is intentionally
 * serializable; richer prop metadata and lazy implementation references stay
 * under `runtime`.
 */
export interface ChartDefinition<TChart extends string = string> {
  readonly schemaVersion: typeof CHART_DEFINITION_SCHEMA_VERSION
  readonly chartFamily: ChartCategory
  readonly chartKind: TChart
  readonly wire: {
    readonly chart: TChart
    readonly version: typeof CHART_DEFINITION_PILOT_VERSION
    readonly schema: ChartDefinitionWireSchema
  }
  readonly runtime: {
    readonly propMetadata: Readonly<Record<string, ChartPropSpec>>
    readonly implementation: LazyImplementationReference
  }
  readonly metadata: ChartDefinitionMetadata
}

interface PilotDefinitionReferences {
  readonly implementation: LazyImplementationReference
  readonly capabilityModule: string
  readonly propDocs: ChartDefinitionPropDocs
  readonly server: ChartDefinitionServerSupport
  readonly examples: readonly ChartDefinitionExampleReference[]
}

const STABLE_LIFECYCLE: ChartDefinitionLifecycle = { status: "stable" }

function asRuntimeTypes(type: PropType | PropType[]): readonly PropType[] {
  return Array.isArray(type) ? type : [type]
}

function isWireJsonType(type: PropType): type is WireJsonType {
  return type !== "function"
}

/**
 * Build a strict wire schema from the current ChartSpec without duplicating
 * the public prop declaration. This deliberately differs from the legacy AI
 * schema generator: a function-only prop is omitted here rather than emitted
 * as an unconstrained JSON-schema property, because a function cannot cross a
 * persisted/MCP wire boundary.
 */
export function createChartDefinitionWireSchema(spec: ChartSpec): ChartDefinitionWireSchema {
  const properties: Record<string, ChartDefinitionWireProperty> = {}
  const runtimeOnlyProps: string[] = []

  for (const [name, prop] of Object.entries(composeProps(spec))) {
    const runtimeTypes = asRuntimeTypes(prop.type)
    const wireTypes = runtimeTypes.filter(isWireJsonType)

    if (prop.omitFromSchema || wireTypes.length === 0) {
      runtimeOnlyProps.push(name)
      continue
    }

    const wireProperty: {
      type: WireJsonType | readonly WireJsonType[]
      enum?: readonly string[]
      default?: unknown
      description?: string
      "x-semiotic-runtime-types"?: readonly PropType[]
    } = {
      type: wireTypes.length === 1 ? wireTypes[0] : wireTypes,
    }
    if (prop.enum) wireProperty.enum = [...prop.enum]
    if (prop.default !== undefined) wireProperty.default = prop.default
    if (prop.description) wireProperty.description = prop.description
    if (wireTypes.length !== runtimeTypes.length) {
      wireProperty["x-semiotic-runtime-types"] = [...runtimeTypes]
    }
    properties[name] = wireProperty
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties,
    required: [...spec.required],
    "x-semiotic-runtime-only-props": runtimeOnlyProps,
  }
}

function chartSpecFor<TChart extends ChartDefinitionPilotId>(chart: TChart): ChartSpec {
  const spec = CHART_SPECS[chart]
  if (!spec) {
    throw new Error(`ChartDefinition pilot references missing ChartSpec: ${chart}`)
  }
  return spec
}

function createChartDefinition<TChart extends ChartDefinitionPilotId>(
  chart: TChart,
  references: PilotDefinitionReferences,
): ChartDefinition<TChart> {
  const spec = chartSpecFor(chart)
  return {
    schemaVersion: CHART_DEFINITION_SCHEMA_VERSION,
    chartFamily: spec.category,
    chartKind: chart,
    wire: {
      chart,
      version: CHART_DEFINITION_PILOT_VERSION,
      schema: createChartDefinitionWireSchema(spec),
    },
    runtime: {
      propMetadata: composeProps(spec),
      implementation: references.implementation,
    },
    metadata: {
      description: spec.description,
      capabilities: spec.capabilities,
      capabilityModule: references.capabilityModule,
      chartSpec: chart,
      aiSchemaName: chart,
      lifecycle: STABLE_LIFECYCLE,
      propDocs: references.propDocs,
      support: {
        browser: "react",
        server: references.server,
      },
      examples: references.examples,
    },
  }
}

/**
 * One representative per chart family. No existing consumer reads this yet;
 * its purpose is to make parity and generation work executable before any
 * registry is migrated.
 */
export const CHART_DEFINITION_PILOT: Readonly<{
  [TChart in ChartDefinitionPilotId]: ChartDefinition<TChart>
}> = {
  LineChart: createChartDefinition("LineChart", {
    implementation: { module: "semiotic/xy", exportName: "LineChart" },
    capabilityModule: "src/components/charts/xy/LineChart.capability.ts",
    propDocs: {
      componentName: "LineChart",
      route: "/charts/line-chart",
      source: "docs/src/pages/charts/LineChartPage.jsx",
    },
    server: { mode: "render-chart", chartConfig: "LineChart" },
    examples: [{
      route: "/examples/distant-reading",
      source: "docs/src/pages/examples/DistantReadingExamplePage.jsx",
    }],
  }),
  BarChart: createChartDefinition("BarChart", {
    implementation: { module: "semiotic/ordinal", exportName: "BarChart" },
    capabilityModule: "src/components/charts/ordinal/BarChart.capability.ts",
    propDocs: {
      componentName: "BarChart",
      route: "/charts/bar-chart",
      source: "docs/src/pages/charts/BarChartPage.jsx",
    },
    server: { mode: "render-chart", chartConfig: "BarChart" },
    examples: [{
      route: "/examples/distant-reading",
      source: "docs/src/pages/examples/DistantReadingExamplePage.jsx",
    }],
  }),
  ForceDirectedGraph: createChartDefinition("ForceDirectedGraph", {
    implementation: { module: "semiotic/network", exportName: "ForceDirectedGraph" },
    capabilityModule: "src/components/charts/network/ForceDirectedGraph.capability.ts",
    propDocs: {
      componentName: "ForceDirectedGraph",
      route: "/charts/force-directed-graph",
      source: "docs/src/pages/charts/ForceDirectedGraphPage.jsx",
    },
    server: { mode: "render-chart", chartConfig: "ForceDirectedGraph" },
    examples: [{
      route: "/examples/local-government-explorer",
      source: "docs/src/pages/examples/LocalGovernmentExplorerExamplePage.jsx",
    }],
  }),
  FlowMap: createChartDefinition("FlowMap", {
    implementation: { module: "semiotic/geo", exportName: "FlowMap" },
    capabilityModule: "src/components/charts/geo/FlowMap.capability.ts",
    propDocs: {
      componentName: "FlowMap",
      route: "/charts/flow-map",
      source: "docs/src/pages/charts/FlowMapPage.jsx",
    },
    server: { mode: "render-chart", chartConfig: "FlowMap" },
    examples: [{
      route: "/examples/port-congestion-replay",
      source: "docs/src/pages/examples/PortCongestionReplayExamplePage.jsx",
    }],
  }),
  GaltonBoardChart: createChartDefinition("GaltonBoardChart", {
    implementation: { module: "semiotic/physics", exportName: "GaltonBoardChart" },
    capabilityModule: "src/components/charts/physics/GaltonBoardChart.capability.ts",
    propDocs: {
      componentName: "GaltonBoardChart",
      route: "/charts/galton-board-chart",
      source: "docs/src/pages/charts/GaltonBoardChartPage.jsx",
    },
    server: { mode: "render-chart", chartConfig: "GaltonBoardChart" },
    examples: [{
      kind: "chart-doc",
      route: "/charts/galton-board-chart",
      source: "docs/src/pages/charts/GaltonBoardChartPage.jsx",
    }],
  }),
  RealtimeLineChart: createChartDefinition("RealtimeLineChart", {
    implementation: { module: "semiotic/realtime", exportName: "RealtimeLineChart" },
    capabilityModule: "src/components/charts/realtime/RealtimeLineChart.capability.ts",
    propDocs: {
      componentName: "RealtimeLineChart",
      route: "/charts/realtime-line-chart",
      source: "docs/src/pages/charts/RealtimeLineChartPage.jsx",
    },
    server: {
      mode: "unavailable",
      reason: "Realtime push frames are not renderChart/MCP static-render targets.",
    },
    examples: [{
      route: "/examples/wikipedia-realtime",
      source: "docs/src/pages/examples/WikipediaRealtimeExamplePage.jsx",
    }],
  }),
  BigNumber: createChartDefinition("BigNumber", {
    implementation: { module: "semiotic/value", exportName: "BigNumber" },
    capabilityModule: "src/components/charts/value/BigNumber.capability.ts",
    propDocs: {
      componentName: "BigNumber",
      route: "/charts/big-number",
      source: "docs/src/pages/charts/BigNumberPage.jsx",
    },
    server: {
      mode: "react-ssr-only",
      reason: "BigNumber is React-SSR safe but does not use the Stream Frame renderChart adapter.",
    },
    examples: [{
      route: "/examples/local-government-explorer",
      source: "docs/src/pages/examples/LocalGovernmentExplorerExamplePage.jsx",
    }],
  }),
}

export interface ChartDefinitionArtifact {
  readonly chart: string
  readonly schemaVersion: typeof CHART_DEFINITION_SCHEMA_VERSION
  readonly wire: ChartDefinition["wire"]
  readonly runtime: {
    readonly implementation: LazyImplementationReference
    readonly propNames: readonly string[]
  }
  readonly metadata: ChartDefinitionMetadata
}

/**
 * Pure generation hook for future schema/docs/registry emitters. Its output is
 * JSON-serializable and intentionally has no component or server imports.
 */
export function generateChartDefinitionArtifacts(
  registry: Readonly<Record<string, ChartDefinition>> = CHART_DEFINITION_PILOT,
): readonly ChartDefinitionArtifact[] {
  return Object.values(registry).map((definition) => ({
    chart: definition.chartKind,
    schemaVersion: definition.schemaVersion,
    wire: definition.wire,
    runtime: {
      implementation: definition.runtime.implementation,
      propNames: Object.keys(definition.runtime.propMetadata),
    },
    metadata: definition.metadata,
  }))
}

export function getChartDefinition(
  chart: string,
): ChartDefinition<ChartDefinitionPilotId> | undefined {
  return CHART_DEFINITION_PILOT[chart as ChartDefinitionPilotId]
}
