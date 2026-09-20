/** Pure chart definitions: metadata only, never component or renderer imports. */
import {
  composeProps,
  type ChartCapabilities,
  type ChartCategory,
  type ChartPropSpec,
  type ChartSpec,
  type PropType
} from "./chartSpecCore"

/** Version of the definition shape, independently from the package version. */
export const CHART_DEFINITION_SCHEMA_VERSION = 1 as const

/** Version of the incremental chart definition manifest. */
export const CHART_DEFINITION_VERSION = "1.0.0" as const

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
  | {
      readonly mode: "render-chart"
      readonly chartConfig: string
      readonly implementation?: LazyImplementationReference
    }
  | { readonly mode: "react-ssr-only"; readonly reason: string }
  | { readonly mode: "unavailable"; readonly reason: string }

/** MCP rendering can be narrower than the public static server API. */
export type ChartDefinitionMCPSupport =
  | { readonly mode: "render-chart"; readonly category?: ChartCategory }
  | { readonly mode: "unavailable"; readonly reason: string }

/**
 * References into the current docs surface. They remain links for now: the
 * ExampleDefinition registry owns gallery routes; chart-doc links name authored guides.
 */
export interface ChartDefinitionExampleReference {
  /** `chart-doc` is an interactive documentation demo pending ExampleDefinition migration. */
  readonly kind?: "example" | "chart-doc"
  readonly route: string
  readonly source: string
}

/** Explicit lifecycle metadata; no registered chart is deprecated. */
export interface ChartDefinitionLifecycle {
  readonly status: "stable" | "experimental" | "deprecated" | "internal"
  readonly since?: string
  readonly deprecation?: {
    readonly since: string
    readonly replacement?: string
  }
}

/** Public guide and component identifier (also consumed by PropTable pages). */
export interface ChartDefinitionPropDocs {
  readonly componentName: string
  readonly route: string
  readonly source: string
}

export interface ChartDefinitionMetadata {
  readonly description: string
  /** Explicit ChartSpec import override for AI schemas and MCP registration. */
  readonly importPath?: string
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
    readonly mcp?: ChartDefinitionMCPSupport
  }
  readonly examples: readonly ChartDefinitionExampleReference[]
}

/**
 * Incremental manifest shape. `wire` is intentionally
 * serializable; richer prop metadata and lazy implementation references stay
 * under `runtime`.
 */
export interface ChartDefinition<TChart extends string = string> {
  readonly schemaVersion: typeof CHART_DEFINITION_SCHEMA_VERSION
  readonly chartFamily: ChartCategory
  readonly chartKind: TChart
  readonly wire: {
    readonly chart: TChart
    readonly version: typeof CHART_DEFINITION_VERSION
    readonly schema: ChartDefinitionWireSchema
  }
  readonly runtime: {
    readonly propMetadata: Readonly<Record<string, ChartPropSpec>>
    readonly implementation: LazyImplementationReference
  }
  readonly metadata: ChartDefinitionMetadata
}

export interface ChartDefinitionReferences {
  readonly implementation: LazyImplementationReference
  readonly capabilityModule: string
  readonly propDocs: ChartDefinitionPropDocs
  readonly server: ChartDefinitionServerSupport
  readonly mcp?: ChartDefinitionMCPSupport
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
export function createChartDefinitionWireSchema(
  spec: ChartSpec
): ChartDefinitionWireSchema {
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
      type: wireTypes.length === 1 ? wireTypes[0] : wireTypes
    }
    if (prop.enum) wireProperty.enum = [...prop.enum]
    if (prop.default !== undefined) wireProperty.default = prop.default
    if (prop.description) wireProperty.description = prop.description
    if (prop.schema) Object.assign(wireProperty, prop.schema)
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
    "x-semiotic-runtime-only-props": runtimeOnlyProps
  }
}

export function createChartDefinition(
  spec: ChartSpec,
  references: ChartDefinitionReferences
): ChartDefinition {
  const chart = spec.name
  return {
    schemaVersion: CHART_DEFINITION_SCHEMA_VERSION,
    chartFamily: spec.category,
    chartKind: chart,
    wire: {
      chart,
      version: CHART_DEFINITION_VERSION,
      schema: createChartDefinitionWireSchema(spec)
    },
    runtime: {
      propMetadata: composeProps(spec),
      implementation: references.implementation
    },
    metadata: {
      description: spec.description,
      ...(spec.importPath ? { importPath: spec.importPath } : {}),
      capabilities: spec.capabilities,
      capabilityModule: references.capabilityModule,
      chartSpec: chart,
      aiSchemaName: chart,
      lifecycle: STABLE_LIFECYCLE,
      propDocs: references.propDocs,
      support: {
        browser: "react",
        server: references.server,
        ...(references.mcp ? { mcp: references.mcp } : {})
      },
      examples: references.examples
    }
  }
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
