import type { NetworkChartType } from "../networkTypes"

/** Chart types that `registerBuiltInNetworkLayouts()` can restore. */
const BUILT_IN_LAYOUT_TYPES: ReadonlySet<NetworkChartType> = new Set<NetworkChartType>([
  "sankey",
  "force",
  "chord",
  "tree",
  "cluster",
  "treemap",
  "circlepack",
  "partition",
  "orbit"
])

export function isBuiltInNetworkLayout(chartType: NetworkChartType): boolean {
  return BUILT_IN_LAYOUT_TYPES.has(chartType)
}
