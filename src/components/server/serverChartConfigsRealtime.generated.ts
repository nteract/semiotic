/**
 * AUTO-GENERATED from chartDefinitionsRealtime.ts by scripts/regenerate-schema.ts.
 * Do not edit by hand; run `npm run docs:chart-specs:schema`.
 */
import type { ChartConfig } from "./serverChartConfigShared"
import { realtimeLineChart, realtimeHistogram, realtimeSwarmChart, realtimeWaterfallChart, realtimeHeatmap } from "./serverChartConfigsRealtime"
import { temporalHistogram } from "./serverChartConfigsXY"

export const REALTIME_CHART_CONFIGS = {
  RealtimeLineChart: realtimeLineChart,
  RealtimeHistogram: realtimeHistogram,
  TemporalHistogram: temporalHistogram,
  RealtimeSwarmChart: realtimeSwarmChart,
  RealtimeWaterfallChart: realtimeWaterfallChart,
  RealtimeHeatmap: realtimeHeatmap
} satisfies Record<string, ChartConfig>
