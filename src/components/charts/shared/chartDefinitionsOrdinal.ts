import { createChartDefinition, type ChartDefinition } from "./chartDefinition"
import { ORDINAL_CHART_SPECS } from "./chartSpecsOrdinal"

/** Ordinal registration references; chart specs continue to own props and capabilities. */
const references = {
  BarChart: ["bar-chart", "barChart"],
  StackedBarChart: ["stacked-bar-chart", "stackedBarChart"],
  GroupedBarChart: ["grouped-bar-chart", "groupedBarChart"],
  SwarmPlot: ["swarm-plot", "swarmPlot"],
  BoxPlot: ["box-plot", "boxPlot"],
  Histogram: ["histogram", "histogram"],
  ViolinPlot: ["violin-plot", "violinPlot"],
  RidgelinePlot: ["ridgeline-plot", "ridgelinePlot"],
  DotPlot: ["dot-plot", "dotPlot"],
  PieChart: ["pie-chart", "pieChart"],
  DonutChart: ["donut-chart", "donutChart"],
  GaugeChart: ["gauge-chart", "gaugeChart"],
  FunnelChart: ["funnel-chart", "funnelChart"],
  RadarChart: ["radar-chart", "radarChart"],
  SwimlaneChart: ["swimlane-chart", "swimlaneChart"],
  LikertChart: ["likert-chart", "likertChart"]
} as const

export type OrdinalChartDefinitionId = keyof typeof references

export const ORDINAL_CHART_DEFINITIONS = Object.fromEntries(
  Object.entries(references).map(([name, [route, exportName]]) => {
    const spec = ORDINAL_CHART_SPECS[name]
    if (!spec) throw new Error(`Missing ordinal chart spec: ${name}`)
    const section = name === "RidgelinePlot" ? "cookbook" : "charts"
    const propDocs = {
      componentName: name,
      route: `/${section}/${route}`,
      source: `docs/src/pages/${section}/${name}Page.jsx`
    }
    return [
      name,
      createChartDefinition(spec, {
        implementation: { module: "semiotic/ordinal", exportName: name },
        capabilityModule: `src/components/charts/ordinal/${name}.capability.ts`,
        propDocs,
        server: {
          mode: "render-chart",
          chartConfig: name,
          implementation: { module: "./serverChartConfigsOrdinal", exportName }
        },
        examples:
          name === "BarChart"
            ? [
                {
                  route: "/examples/distant-reading",
                  source:
                    "docs/src/pages/examples/DistantReadingExamplePage.jsx"
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
) as Readonly<Record<OrdinalChartDefinitionId, ChartDefinition>>
