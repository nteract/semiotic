import { createChartDefinition, type ChartDefinition } from "./chartDefinition"
import { REALTIME_CHART_SPECS } from "./chartSpecsRealtime"

const references = {
  RealtimeLineChart: ["realtime-line-chart", "realtimeLineChart"],
  RealtimeHistogram: ["realtime-histogram", "realtimeHistogram"],
  TemporalHistogram: ["realtime-histogram", "temporalHistogram"],
  RealtimeSwarmChart: ["realtime-swarm-chart", "realtimeSwarmChart"],
  RealtimeWaterfallChart: [
    "realtime-waterfall-chart",
    "realtimeWaterfallChart"
  ],
  RealtimeHeatmap: ["realtime-heatmap", "realtimeHeatmap"]
} as const

export type RealtimeChartDefinitionId = keyof typeof references

export const REALTIME_CHART_DEFINITIONS = Object.fromEntries(
  Object.entries(references).map(([name, [route, exportName]]) => {
    const spec = REALTIME_CHART_SPECS[name]
    if (!spec) throw new Error(`Missing realtime chart spec: ${name}`)
    const isTemporal = name === "TemporalHistogram"
    const propDocs = {
      componentName: name,
      route: `/charts/${route}`,
      source: `docs/src/pages/charts/${isTemporal ? "RealtimeHistogram" : name}Page.jsx`
    }
    return [
      name,
      createChartDefinition(spec, {
        implementation: { module: "semiotic/realtime", exportName: name },
        capabilityModule: `src/components/charts/realtime/${name}.capability.ts`,
        propDocs,
        server: {
          mode: "render-chart",
          chartConfig: name,
          implementation: {
            module: isTemporal
              ? "./serverChartConfigsXY"
              : "./serverChartConfigsRealtime",
            exportName
          }
        },
        // Preserve the existing MCP category and live-chart exclusion. All six
        // still support bounded data snapshots through semiotic/server.
        mcp: isTemporal
          ? { mode: "render-chart", category: "xy" }
          : {
              mode: "unavailable",
              reason:
                "MCP rendering excludes live realtime charts; use semiotic/server with bounded data for a snapshot."
            },
        examples:
          name === "RealtimeLineChart"
            ? [
                {
                  route: "/examples/wikipedia-realtime",
                  source:
                    "docs/src/pages/examples/WikipediaRealtimeExamplePage.jsx"
                }
              ]
            : [
                {
                  kind: "chart-doc",
                  route: propDocs.route,
                  source: propDocs.source
                }
              ]
      })
    ]
  })
) as Readonly<Record<RealtimeChartDefinitionId, ChartDefinition>>
