/**
 * AUTO-GENERATED from chartDefinitionsXY.ts by scripts/regenerate-schema.ts.
 * Do not edit by hand; run `npm run docs:chart-specs:schema`.
 */
import type { ChartConfig } from "./serverChartConfigShared"
import { lineChart, bumpChart, areaChart, differenceChart, stackedAreaChart, scatterplot, bubbleChart, quadrantChart, multiAxisLineChart, waterfallChart, candlestickChart, connectedScatterplot } from "./serverChartConfigsXY"
import { heatmap } from "./serverChartConfigHeatmap"
import { scatterplotMatrix, minimapChart } from "./serverChartConfigsComposite"

export const XY_CHART_CONFIGS = {
  LineChart: lineChart,
  BumpChart: bumpChart,
  AreaChart: areaChart,
  DifferenceChart: differenceChart,
  StackedAreaChart: stackedAreaChart,
  Scatterplot: scatterplot,
  BubbleChart: bubbleChart,
  Heatmap: heatmap,
  QuadrantChart: quadrantChart,
  MultiAxisLineChart: multiAxisLineChart,
  WaterfallChart: waterfallChart,
  CandlestickChart: candlestickChart,
  ConnectedScatterplot: connectedScatterplot,
  ScatterplotMatrix: scatterplotMatrix,
  MinimapChart: minimapChart
} satisfies Record<string, ChartConfig>
