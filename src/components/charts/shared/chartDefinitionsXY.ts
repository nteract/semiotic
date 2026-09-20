import { createChartDefinition, type ChartDefinition } from "./chartDefinition"
import { XY_CHART_SPECS } from "./chartSpecsXY"

/**
 * Author the XY registration once. The chart specs still own props and
 * capabilities; these references own documentation and renderer wiring.
 * Paths are data for generators, never runtime imports.
 */
const references = {
  LineChart: ["line-chart", "lineChart", "serverChartConfigsXY"],
  BumpChart: ["bump-chart", "bumpChart", "serverChartConfigsXY"],
  AreaChart: ["area-chart", "areaChart", "serverChartConfigsXY"],
  DifferenceChart: [
    "difference-chart",
    "differenceChart",
    "serverChartConfigsXY"
  ],
  StackedAreaChart: [
    "stacked-area-chart",
    "stackedAreaChart",
    "serverChartConfigsXY"
  ],
  Scatterplot: ["scatterplot", "scatterplot", "serverChartConfigsXY"],
  BubbleChart: ["bubble-chart", "bubbleChart", "serverChartConfigsXY"],
  Heatmap: ["heatmap", "heatmap", "serverChartConfigHeatmap"],
  QuadrantChart: ["quadrant-chart", "quadrantChart", "serverChartConfigsXY"],
  MultiAxisLineChart: [
    "multi-axis-line-chart",
    "multiAxisLineChart",
    "serverChartConfigsXY"
  ],
  WaterfallChart: ["waterfall-chart", "waterfallChart", "serverChartConfigsXY"],
  CandlestickChart: [
    "candlestick-chart",
    "candlestickChart",
    "serverChartConfigsXY"
  ],
  ConnectedScatterplot: [
    "connected-scatterplot",
    "connectedScatterplot",
    "serverChartConfigsXY"
  ],
  ScatterplotMatrix: [
    "scatterplot-matrix",
    "scatterplotMatrix",
    "serverChartConfigsComposite"
  ],
  MinimapChart: [
    "time-series-brush",
    "minimapChart",
    "serverChartConfigsComposite"
  ]
} as const

export type XYChartDefinitionId = keyof typeof references

export const XY_CHART_DEFINITIONS = Object.fromEntries(
  Object.entries(references).map(([name, [route, exportName, module]]) => {
    const spec = XY_CHART_SPECS[name]
    if (!spec) throw new Error(`Missing XY chart spec: ${name}`)
    const propDocs = {
      componentName: name,
      route: name === "MinimapChart" ? `/recipes/${route}` : `/charts/${route}`,
      source:
        name === "MinimapChart"
          ? "docs/src/pages/recipes/TimeSeriesBrushPage.jsx"
          : `docs/src/pages/charts/${name}Page.jsx`
    }
    return [
      name,
      createChartDefinition(spec, {
        implementation: {
          module: name === "LineChart" ? "semiotic/line" : "semiotic/xy",
          exportName: name
        },
        capabilityModule:
          name === "ScatterplotMatrix"
            ? "src/components/charts/shared/chartSpecsXY.ts"
            : `src/components/charts/xy/${name}.capability.ts`,
        propDocs,
        server: {
          mode: "render-chart",
          chartConfig: name,
          implementation: { module: `./${module}`, exportName }
        },
        examples:
          name === "LineChart"
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
) as Readonly<Record<XYChartDefinitionId, ChartDefinition>>
