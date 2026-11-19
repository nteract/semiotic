/**
 * semiotic/line — one-chart boundary for LineChart.

 * This entry excludes the rest of the XY catalog and direct
 * StreamXYFrame. Use `semiotic/xy` when a route needs another XY chart or the
 * lower-level frame API.
 */

"use client"

export { LineChart } from "./charts/xy/LineChart"
export type { LineChartProps } from "./charts/xy/LineChart"
export type { XYBrushEndMeta, XYBrushExtent, XYBrushExtentInput } from "./stream/xyBrushTypes"

// Row fields the `forecast` and `anomaly` overlays write on the rows they draw,
// which a custom tooltip or callback reads from its datum.
export {
  SEGMENT_FIELD as FORECAST_SEGMENT_FIELD,
  ANOMALY_FIELD,
  RESOLVED_X_FIELD,
  RESOLVED_Y_FIELD,
} from "./charts/shared/statisticalOverlaysLazy"
export type { ForecastSegment } from "./charts/shared/statisticalOverlaysLazy"
