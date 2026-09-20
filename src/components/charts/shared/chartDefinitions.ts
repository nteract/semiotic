/** Incremental registry: the XY, ordinal, network, physics, and realtime families and two other family representatives. */
import { CHART_SPECS } from "./chartSpecs"
import {
  createChartDefinition,
  type ChartDefinition,
  type ChartDefinitionArtifact
} from "./chartDefinition"
import { XY_CHART_DEFINITIONS } from "./chartDefinitionsXY"
import { ORDINAL_CHART_DEFINITIONS } from "./chartDefinitionsOrdinal"
import { NETWORK_CHART_DEFINITIONS } from "./chartDefinitionsNetwork"
import { PHYSICS_CHART_DEFINITIONS } from "./chartDefinitionsPhysics"
import { REALTIME_CHART_DEFINITIONS } from "./chartDefinitionsRealtime"
export * from "./chartDefinition"

export const CHART_DEFINITIONS: Readonly<Record<string, ChartDefinition>> = {
  ...XY_CHART_DEFINITIONS,
  ...ORDINAL_CHART_DEFINITIONS,
  ...NETWORK_CHART_DEFINITIONS,
  ...PHYSICS_CHART_DEFINITIONS,
  ...REALTIME_CHART_DEFINITIONS,
  FlowMap: createChartDefinition(CHART_SPECS.FlowMap, {
    implementation: { module: "semiotic/geo", exportName: "FlowMap" },
    capabilityModule: "src/components/charts/geo/FlowMap.capability.ts",
    propDocs: {
      componentName: "FlowMap",
      route: "/charts/flow-map",
      source: "docs/src/pages/charts/FlowMapPage.jsx"
    },
    server: { mode: "render-chart", chartConfig: "FlowMap" },
    examples: [
      {
        route: "/examples/port-congestion-replay",
        source: "docs/src/pages/examples/PortCongestionReplayExamplePage.jsx"
      }
    ]
  }),
  BigNumber: createChartDefinition(CHART_SPECS.BigNumber, {
    implementation: { module: "semiotic/value", exportName: "BigNumber" },
    capabilityModule: "src/components/charts/value/BigNumber.capability.ts",
    propDocs: {
      componentName: "BigNumber",
      route: "/charts/big-number",
      source: "docs/src/pages/charts/BigNumberPage.jsx"
    },
    server: {
      mode: "render-chart",
      chartConfig: "BigNumber"
    },
    examples: [
      {
        route: "/examples/local-government-explorer",
        source: "docs/src/pages/examples/LocalGovernmentExplorerExamplePage.jsx"
      }
    ]
  })
}

export const CHART_DEFINITION_IDS = Object.keys(CHART_DEFINITIONS)

/**
 * Pure generation hook for future schema/docs/registry emitters. Its output is
 * JSON-serializable and intentionally has no component or server imports.
 */
export function generateChartDefinitionArtifacts(
  registry: Readonly<Record<string, ChartDefinition>> = CHART_DEFINITIONS
): readonly ChartDefinitionArtifact[] {
  return Object.values(registry).map((definition) => ({
    chart: definition.chartKind,
    schemaVersion: definition.schemaVersion,
    wire: definition.wire,
    runtime: {
      implementation: definition.runtime.implementation,
      propNames: Object.keys(definition.runtime.propMetadata)
    },
    metadata: definition.metadata
  }))
}

export function getChartDefinition(chart: string): ChartDefinition | undefined {
  return CHART_DEFINITIONS[chart]
}
