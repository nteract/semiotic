/**
 * Vega-Lite to Semiotic translator.
 * Converts a Vega-Lite spec into a Semiotic ChartConfig.
 *
 * Scope: core marks (bar, line, point, area, rect, arc, circle, square, tick)
 * with basic encodings. No layers, facets, selections, or complex transforms.
 */
import type { ChartConfig } from "../export/chartConfig"
import { rollup } from "./transforms"

// ── Types ────────────────────────────────────────────────────────────────

export interface VegaLiteEncoding {
  field?: string
  type?: "quantitative" | "nominal" | "ordinal" | "temporal"
  aggregate?: string
  scale?: { scheme?: string; range?: any; domain?: any }
  axis?: { title?: string; labelAngle?: number }
  value?: any
  bin?: boolean | { maxbins?: number }
  stack?: boolean | string | null
}

export interface VegaLiteSpec {
  mark: string | { type: string; [key: string]: any }
  data?: { values?: any[]; url?: string }
  encoding?: Record<string, VegaLiteEncoding>
  width?: number
  height?: number
  title?: string | { text: string }
  transform?: any[]
  [key: string]: any
}

// ── Helpers ──────────────────────────────────────────────────────────────

function normalizeMark(mark: string | { type: string; [key: string]: any }): {
  type: string
  markProps: Record<string, any>
} {
  if (typeof mark === "string") {
    return { type: mark, markProps: {} }
  }
  const { type, ...markProps } = mark
  return { type, markProps }
}

function extractTitle(title?: string | { text: string }): string | undefined {
  if (!title) return undefined
  if (typeof title === "string") return title
  return title.text
}

function isCategory(type?: string): boolean {
  return type === "nominal" || type === "ordinal"
}

function isQuantitative(type?: string): boolean {
  return type === "quantitative" || type === "temporal"
}

/** Map Vega-Lite color scheme names to Semiotic equivalents */
const SCHEME_MAP: Record<string, string> = {
  category10: "category10",
  category20: "category20",
  category20b: "category20",
  category20c: "category20",
  accent: "accent",
  dark2: "dark2",
  paired: "paired",
  pastel1: "pastel1",
  pastel2: "pastel2",
  set1: "set1",
  set2: "set2",
  set3: "set3",
  tableau10: "category10",
  tableau20: "category20",
}

/** Map Vega-Lite interpolation names to Semiotic curve names */
const CURVE_MAP: Record<string, string> = {
  linear: "linear",
  "monotone-x": "monotoneX",
  "monotone-y": "monotoneY",
  monotone: "monotoneX",
  step: "step",
  "step-after": "stepAfter",
  "step-before": "stepBefore",
  basis: "basis",
  cardinal: "cardinal",
  "catmull-rom": "catmullRom",
}

/** Map Vega-Lite aggregate names to rollup agg names */
const AGG_MAP: Record<string, "sum" | "mean" | "count" | "min" | "max"> = {
  sum: "sum",
  mean: "mean",
  average: "mean",
  count: "count",
  min: "min",
  max: "max",
  median: "mean", // approximate
}

// ── Main ─────────────────────────────────────────────────────────────────

export function fromVegaLite(spec: VegaLiteSpec): ChartConfig & { warnings?: string[] } {
  const warnings: string[] = []
  const { type: markType, markProps } = normalizeMark(spec.mark)
  const enc = spec.encoding || {}
  const x = enc.x
  const y = enc.y
  const color = enc.color
  const size = enc.size
  const theta = enc.theta
  const opacity = enc.opacity

  // Data handling
  let data: any[] | undefined
  if (spec.data?.values) {
    data = spec.data.values
  } else if (spec.data?.url) {
    warnings.push("data.url is not supported — only inline data.values can be translated. Provide data manually.")
  }

  if (spec.transform && spec.transform.length > 0) {
    warnings.push("Vega-Lite transforms are not supported. Pre-transform your data before passing to fromVegaLite().")
  }

  // Determine component and build props
  const props: Record<string, any> = {}

  // Layout
  if (spec.width) props.width = spec.width
  if (spec.height) props.height = spec.height
  const title = extractTitle(spec.title)
  if (title) props.title = title

  // Color encoding (shared across all chart types)
  if (color?.field) {
    props.colorBy = color.field
    if (color.scale?.scheme) {
      const mapped = SCHEME_MAP[color.scale.scheme]
      if (mapped) props.colorScheme = mapped
    }
  }

  // Opacity
  if (opacity?.value !== undefined) {
    props.pointOpacity = opacity.value
  }

  // Pre-aggregate data if needed
  const xAgg = x?.aggregate
  const yAgg = y?.aggregate
  if (data && (xAgg || yAgg)) {
    const aggField = yAgg ? y! : x!
    const groupField = yAgg ? x : y
    const aggName = AGG_MAP[aggField.aggregate!]

    if (aggName && groupField?.field && aggField.field) {
      data = rollup(data, {
        groupBy: groupField.field,
        value: aggField.field,
        agg: aggName,
      })
      // rollup outputs { [groupBy]: key, value: aggregated }
      // Update the accessor for the aggregated field
      if (yAgg) {
        // y was aggregated, its accessor is now "value"
        // We'll set this below per component type
      }
    } else if (aggName === "count" || aggField.aggregate === "count") {
      // count aggregate — group by the other field
      if (groupField?.field && data) {
        const counts = new Map<string, number>()
        for (const d of data) {
          const key = String(d[groupField.field])
          counts.set(key, (counts.get(key) || 0) + 1)
        }
        data = Array.from(counts, ([k, v]) => ({ [groupField.field]: k, value: v }))
      }
    }
  }

  // Handle bin → Histogram
  if (x?.bin || y?.bin) {
    const component = "Histogram"
    if (data) props.data = data
    // For histogram, the binned field becomes the value, category is the grouping
    if (x?.bin) {
      props.valueAccessor = x.field
      if (y?.field) props.categoryAccessor = y.field
      if (x.axis?.title) props.valueLabel = x.axis.title
    } else if (y?.bin) {
      props.valueAccessor = y.field
      if (x?.field) props.categoryAccessor = x.field
      if (y.axis?.title) props.valueLabel = y.axis.title
    }
    const maxbins = typeof (x?.bin || y?.bin) === "object"
      ? (x?.bin as any)?.maxbins || (y?.bin as any)?.maxbins
      : undefined
    if (maxbins) props.bins = maxbins

    return buildConfig(component, props, warnings)
  }

  let component: string

  switch (markType) {
    case "bar": {
      component = resolveBarComponent(x, y, color, props, data, xAgg, yAgg)
      break
    }
    case "line": {
      component = "LineChart"
      setXYAccessors(x, y, props, xAgg, yAgg)
      if (color?.field) {
        props.lineBy = color.field
      }
      if (markProps.interpolate) {
        const curve = CURVE_MAP[markProps.interpolate]
        if (curve) props.curve = curve
      }
      if (markProps.point === true) {
        props.showPoints = true
      }
      if (data) props.data = data
      break
    }
    case "area": {
      if (color?.field) {
        component = "StackedAreaChart"
        props.areaBy = color.field
      } else {
        component = "AreaChart"
      }
      setXYAccessors(x, y, props, xAgg, yAgg)
      if (markProps.interpolate) {
        const curve = CURVE_MAP[markProps.interpolate]
        if (curve) props.curve = curve
      }
      if (markProps.opacity !== undefined) {
        props.areaOpacity = markProps.opacity
      }
      if (data) props.data = data
      break
    }
    case "point":
    case "circle":
    case "square": {
      if (size?.field) {
        component = "BubbleChart"
        props.sizeBy = size.field
        if (size.scale?.range) {
          props.sizeRange = size.scale.range
        }
      } else {
        component = "Scatterplot"
      }
      setXYAccessors(x, y, props, xAgg, yAgg)
      if (data) props.data = data
      break
    }
    case "rect": {
      component = "Heatmap"
      if (x?.field) props.xAccessor = x.field
      if (y?.field) props.yAccessor = y.field
      // For heatmap, color encoding is the value
      if (color?.field) {
        props.valueAccessor = color.field
        // Don't set colorBy for heatmap, it uses valueAccessor
        delete props.colorBy
      }
      if (x?.axis?.title) props.xLabel = x.axis.title
      if (y?.axis?.title) props.yLabel = y.axis.title
      if (data) props.data = data
      break
    }
    case "arc": {
      if (markProps.innerRadius && markProps.innerRadius > 0) {
        component = "DonutChart"
        props.innerRadius = markProps.innerRadius
      } else {
        component = "PieChart"
      }
      // Arc uses theta for value, color for category
      if (theta?.field) {
        props.valueAccessor = theta.field
      } else if (y?.field) {
        props.valueAccessor = yAgg ? "value" : y.field
      }
      if (color?.field) {
        props.categoryAccessor = color.field
        // For pie/donut, colorBy is implicit from categoryAccessor
      }
      if (x?.field && !theta?.field) {
        props.categoryAccessor = x.field
      }
      if (data) props.data = data
      break
    }
    case "tick": {
      component = "DotPlot"
      if (isCategory(x?.type)) {
        props.categoryAccessor = x!.field
        if (y?.field) props.valueAccessor = yAgg ? "value" : y.field
        if (x?.axis?.title) props.categoryLabel = x.axis.title
        if (y?.axis?.title) props.valueLabel = y.axis.title
      } else if (isCategory(y?.type)) {
        props.categoryAccessor = y!.field
        if (x?.field) props.valueAccessor = xAgg ? "value" : x.field
        props.orientation = "horizontal"
        if (y?.axis?.title) props.categoryLabel = y.axis.title
        if (x?.axis?.title) props.valueLabel = x.axis.title
      } else {
        // Default: x is category
        if (x?.field) props.categoryAccessor = x.field
        if (y?.field) props.valueAccessor = yAgg ? "value" : y.field
      }
      if (data) props.data = data
      break
    }
    default: {
      warnings.push(`Unsupported mark type "${markType}". Defaulting to Scatterplot.`)
      component = "Scatterplot"
      setXYAccessors(x, y, props, xAgg, yAgg)
      if (data) props.data = data
      break
    }
  }

  return buildConfig(component, props, warnings)
}

// ── Internal helpers ─────────────────────────────────────────────────────

function resolveBarComponent(
  x: VegaLiteEncoding | undefined,
  y: VegaLiteEncoding | undefined,
  color: VegaLiteEncoding | undefined,
  props: Record<string, any>,
  data: any[] | undefined,
  xAgg?: string,
  yAgg?: string,
): string {
  let component: string
  const isStacked = color?.field && (
    // Explicitly stacked or not explicitly unstacked
    x?.stack !== false && y?.stack !== false &&
    x?.stack !== null && y?.stack !== null
  )

  if (isStacked) {
    component = "StackedBarChart"
    props.stackBy = color!.field
  } else {
    component = "BarChart"
  }

  // Determine orientation from encoding types
  if (isCategory(x?.type) && isQuantitative(y?.type)) {
    // Vertical bars: x = category, y = value
    props.categoryAccessor = x!.field
    props.valueAccessor = yAgg ? "value" : y!.field
    if (x?.axis?.title) props.categoryLabel = x.axis.title
    if (y?.axis?.title) props.valueLabel = y.axis.title
  } else if (isQuantitative(x?.type) && isCategory(y?.type)) {
    // Horizontal bars: y = category, x = value
    props.categoryAccessor = y!.field
    props.valueAccessor = xAgg ? "value" : x!.field
    props.orientation = "horizontal"
    if (y?.axis?.title) props.categoryLabel = y.axis.title
    if (x?.axis?.title) props.valueLabel = x.axis.title
  } else {
    // Fallback: guess from field names
    if (x?.field) props.categoryAccessor = x.field
    if (y?.field) props.valueAccessor = yAgg ? "value" : y.field
    if (x?.axis?.title) props.categoryLabel = x.axis.title
    if (y?.axis?.title) props.valueLabel = y.axis.title
  }

  if (data) props.data = data

  return component
}

function setXYAccessors(
  x: VegaLiteEncoding | undefined,
  y: VegaLiteEncoding | undefined,
  props: Record<string, any>,
  xAgg?: string,
  yAgg?: string,
): void {
  if (x?.field) props.xAccessor = xAgg ? "value" : x.field
  if (y?.field) props.yAccessor = yAgg ? "value" : y.field
  if (x?.axis?.title) props.xLabel = x.axis.title
  if (y?.axis?.title) props.yLabel = y.axis.title
}

function buildConfig(
  component: string,
  props: Record<string, any>,
  warnings: string[],
): ChartConfig & { warnings?: string[] } {
  const config: ChartConfig & { warnings?: string[] } = {
    component,
    props,
    version: "1",
    createdAt: new Date().toISOString(),
  }
  if (warnings.length > 0) {
    config.warnings = warnings
  }
  return config
}
