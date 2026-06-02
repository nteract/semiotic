import type { Datum } from "../charts/shared/datumTypes"

/**
 * Shared chart-family classification + measure/dimension role resolution.
 *
 * `describeChart` (prose) and `buildNavigationTree` (structure) both need to
 * know which family a component belongs to and which props carry its measure
 * (quantitative) and dimension (categorical/ordered) accessors. This is the
 * single source of truth so the two surfaces can't drift apart.
 *
 * Pure, dependency-light (types only).
 */

export const XY_FAMILY = new Set([
  "LineChart", "AreaChart", "StackedAreaChart", "DifferenceChart", "Scatterplot",
  "BubbleChart", "ConnectedScatterplot", "QuadrantChart", "MultiAxisLineChart", "MinimapChart",
])
export const BAR_FAMILY = new Set([
  "BarChart", "StackedBarChart", "GroupedBarChart", "DotPlot",
])
export const PART_TO_WHOLE = new Set(["PieChart", "DonutChart", "FunnelChart"])
export const DISTRIBUTION = new Set(["Histogram", "BoxPlot", "ViolinPlot", "RidgelinePlot", "SwarmPlot"])

export interface ChartRoles {
  measure?: string
  measureFallback: string
  dimension?: string
  dimensionFallback: string
}

/** The measure (quantitative) and dimension (categorical/ordered) accessors, by family. */
export function roles(component: string, props: Datum): ChartRoles {
  if (BAR_FAMILY.has(component) || PART_TO_WHOLE.has(component) || component === "SwimlaneChart" || component === "GaugeChart") {
    return {
      measure: props.valueAccessor as string | undefined, measureFallback: "value",
      dimension: (props.categoryAccessor ?? props.stepAccessor) as string | undefined, dimensionFallback: "category",
    }
  }
  // XY + distribution default
  return {
    measure: (props.yAccessor ?? props.valueAccessor) as string | undefined, measureFallback: "y",
    dimension: props.xAccessor as string | undefined, dimensionFallback: "x",
  }
}

/** First string-valued series-splitting accessor among the known channels, if any. */
export function seriesField(props: Datum): string | undefined {
  for (const k of ["lineBy", "areaBy", "stackBy", "groupBy", "colorBy"]) {
    const v = props[k]
    if (typeof v === "string" && v) return v
  }
  return undefined
}

/** Format a dimension value (the label at an extremum) — dates as ISO day, numbers compactly. */
export function fmtDim(v: unknown, fmtNum: (n: number) => string): string {
  if (v == null) return "—"
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === "number") return fmtNum(v)
  return String(v)
}
