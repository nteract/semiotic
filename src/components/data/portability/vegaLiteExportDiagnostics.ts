import type { Datum } from "../../charts/shared/datumTypes"
import type { PortabilityLoss } from "./result"

const SHARED = ["data", "title", "width", "height", "colorScheme"]
const XY = [
  "xAccessor",
  "yAccessor",
  "xLabel",
  "yLabel",
  "xScaleType",
  "yScaleType"
]
const ORDINAL = [
  "categoryAccessor",
  "valueAccessor",
  "categoryLabel",
  "valueLabel",
  "orientation"
]
const SUPPORTED: Record<string, string[]> = {
  BarChart: [...ORDINAL],
  StackedBarChart: [...ORDINAL, "stackBy", "normalize"],
  GroupedBarChart: [...ORDINAL, "groupBy"],
  LineChart: [...XY, "lineBy", "colorBy", "curve", "showPoints"],
  AreaChart: [...XY, "curve", "areaOpacity"],
  StackedAreaChart: [...XY, "areaBy", "curve", "areaOpacity", "normalize"],
  Scatterplot: [...XY, "colorBy", "pointOpacity"],
  BubbleChart: [...XY, "colorBy", "sizeBy", "sizeRange"],
  Heatmap: ["xAccessor", "yAccessor", "valueAccessor", "xLabel", "yLabel"],
  PieChart: ["categoryAccessor", "valueAccessor"],
  DonutChart: ["categoryAccessor", "valueAccessor", "innerRadius"],
  DotPlot: [...ORDINAL],
  Histogram: ["valueAccessor", "valueLabel", "categoryAccessor", "bins"]
}

/** Named schemes must also exist in Semiotic; object palettes need a domain mapping. */
export function exportableColorScheme(component: string, value: unknown): value is string | string[] {
  if (Array.isArray(value)) return value.length > 0 && Array.from(value).every(color => typeof color === "string" && color.trim().length > 0)
  const names = component === "Heatmap"
    ? ["category10", "tableau10", "set3", "blues", "reds", "greens", "viridis", "oranges", "purples", "greys", "plasma", "inferno", "magma", "cividis", "turbo"]
    : ["category10", "tableau10", "set3"]
  return typeof value === "string" && names.includes(value)
}

/** Every present prop outside the translated subset is a declared loss. */
export function vegaLiteExportLosses(
  component: string,
  props: Datum
): PortabilityLoss[] {
  const losses: PortabilityLoss[] = []
  const add = (
    key: string,
    message = `The ${key} prop is not represented by this Vega-Lite export.`
  ) =>
    losses.push({
      code: "UNSUPPORTED_PROP",
      path: `/props/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`,
      message
    })
  const allowed = Object.prototype.hasOwnProperty.call(SUPPORTED, component)
    ? SUPPORTED[component]
    : []
  // The importer records implicit category colors as colorBy; those references
  // are equivalent only when they name the exported category/group channel.
  const implicitColor = props.stackBy ?? props.areaBy ?? props.categoryAccessor
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || SHARED.includes(key) || allowed.includes(key))
      continue
    if (key === "colorBy" && value === implicitColor) continue
    add(key)
  }
  if (props.lineBy && props.colorBy && props.lineBy !== props.colorBy)
    add(
      "colorBy",
      "Independent line grouping and color fields cannot share one Vega-Lite color channel."
    )
  for (const axis of ["x", "y"]) {
    const key = `${axis}ScaleType`
    if (
      allowed.includes(key) &&
      props[key] !== undefined &&
      !(
        axis === "x" ? ["linear", "log", "time"] : ["linear", "log", "symlog"]
      ).includes(props[key])
    )
      add(key)
  }
  if (
    props.curve !== undefined &&
    ![
      "linear",
      "monotoneX",
      "monotoneY",
      "step",
      "stepAfter",
      "stepBefore",
      "basis",
      "cardinal",
      "catmullRom"
    ].includes(props.curve)
  )
    add("curve")
  if (component === "DonutChart" && props.innerRadius === undefined)
    add(
      "innerRadius",
      "DonutChart computes its default inner radius from its responsive container; an explicit innerRadius is required for an exact export."
    )
  if (props.colorScheme !== undefined && !exportableColorScheme(component, props.colorScheme)) add("colorScheme", "This color scheme cannot be preserved as a supported named scheme or color array.")
  return losses
}
