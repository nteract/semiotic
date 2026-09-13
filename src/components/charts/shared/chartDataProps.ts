/** Data identity shared by serialized chart configs and artifact bindings. */
export const CHART_DATA_PROPS: ReadonlySet<string> = new Set([
  "data",
  "nodes",
  "edges",
  "points",
  "areas",
  "lines",
  "flows",
  "atlas",
  "forest",
  "circuit",
  "edition",
  "reading"
])

export function isChartDataProp(key: string, value: unknown): boolean {
  // Dependency's reading is a display mode; Circuit's reading is a tape cursor
  // containing measurements. Only the latter is a data-bearing prop.
  return (
    CHART_DATA_PROPS.has(key) &&
    !(key === "reading" && typeof value === "string")
  )
}
