/**
 * semiotic/line — one-chart boundary for LineChart.

 * This entry intentionally excludes the rest of the XY catalog and direct
 * StreamXYFrame. Use `semiotic/xy` when a route needs another XY chart or the
 * lower-level frame API.
 */

"use client"

export { LineChart } from "./charts/xy/LineChart"
export type { LineChartProps } from "./charts/xy/LineChart"
