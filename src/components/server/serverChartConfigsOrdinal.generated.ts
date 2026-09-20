/**
 * AUTO-GENERATED from chartDefinitionsOrdinal.ts by scripts/regenerate-schema.ts.
 * Do not edit by hand; run `npm run docs:chart-specs:schema`.
 */
import type { ChartConfig } from "./serverChartConfigShared"
import { barChart, stackedBarChart, groupedBarChart, swarmPlot, boxPlot, histogram, violinPlot, ridgelinePlot, dotPlot, pieChart, donutChart, gaugeChart, funnelChart, radarChart, swimlaneChart, likertChart } from "./serverChartConfigsOrdinal"

export const ORDINAL_CHART_CONFIGS = {
  BarChart: barChart,
  StackedBarChart: stackedBarChart,
  GroupedBarChart: groupedBarChart,
  SwarmPlot: swarmPlot,
  BoxPlot: boxPlot,
  Histogram: histogram,
  ViolinPlot: violinPlot,
  RidgelinePlot: ridgelinePlot,
  DotPlot: dotPlot,
  PieChart: pieChart,
  DonutChart: donutChart,
  GaugeChart: gaugeChart,
  FunnelChart: funnelChart,
  RadarChart: radarChart,
  SwimlaneChart: swimlaneChart,
  LikertChart: likertChart
} satisfies Record<string, ChartConfig>
