import type { Datum } from "../charts/shared/datumTypes"
/**
 * Observable Plot → Semiotic translator.
 *
 * A sibling to `fromVegaLite`: maps a declarative Observable Plot spec to a
 * Semiotic `ChartConfig`, so a chart sketched in a notebook crosses the
 * notebook→production rewrite tax and arrives with everything a throwaway Plot
 * chart never had — accessible tables, keyboard navigation, descriptions, the
 * a11y audit, theme tokens, annotation provenance, and SSR.
 *
 * Honest hard part (the reason this stages behind `unstable_`): Plot's public
 * API is *imperative JS* (`Plot.line(data, {…})`), not declarative JSON. This
 * adapter consumes the **declarative shape of a Plot spec** — the `{ marks,
 * x, y, color, … }` object you'd pass to `Plot.plot()`, with each mark
 * expressed as `{ type, data?, options? }`. Where a mark, channel, or
 * transform has no faithful Semiotic equivalent, it surfaces a warning and
 * refuses to approximate, rather than emit a plausible-but-wrong chart.
 *
 * Scope (alpha): core marks — line/lineY/lineX, barY/barX, dot, areaY/area,
 * rectY (binned → histogram), cell, tick — with basic channels. No layered
 * multi-mark plots, facets, or Plot transforms (binX/groupY/stackY as option
 * wrappers).
 */
import type { ChartConfig } from "../export/chartConfig"

// ── Types ────────────────────────────────────────────────────────────────

/** A channel value: a field name (string), a constant (number), or — declined — a function. */
export type ObservablePlotChannel = string | number | ((d: Datum, i: number) => unknown)

export interface ObservablePlotMarkOptions {
  x?: ObservablePlotChannel
  y?: ObservablePlotChannel
  fill?: ObservablePlotChannel
  stroke?: ObservablePlotChannel
  r?: ObservablePlotChannel
  z?: ObservablePlotChannel
  curve?: string
  [key: string]: unknown
}

export interface ObservablePlotMark {
  /** The Plot mark function name, e.g. "line", "barY", "dot", "areaY", "cell". */
  type: string
  data?: Datum[]
  options?: ObservablePlotMarkOptions
}

export interface ObservablePlotScale {
  label?: string
  type?: string
  scheme?: string
  domain?: unknown
  range?: unknown
  [key: string]: unknown
}

export interface ObservablePlotSpec {
  marks?: ObservablePlotMark[]
  /** Shared data, when marks don't each carry their own. */
  data?: Datum[]
  width?: number
  height?: number
  title?: string
  x?: ObservablePlotScale
  y?: ObservablePlotScale
  color?: ObservablePlotScale
  r?: ObservablePlotScale
  fx?: unknown
  fy?: unknown
  facet?: unknown
  [key: string]: unknown
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Plot scheme name → Semiotic colorScheme. */
const SCHEME_MAP: Record<string, string> = {
  category10: "category10",
  tableau10: "category10",
  observable10: "category10",
  accent: "accent",
  dark2: "dark2",
  paired: "paired",
  pastel1: "pastel1",
  pastel2: "pastel2",
  set1: "set1",
  set2: "set2",
  set3: "set3",
}

/** Plot curve name → Semiotic curve name. */
const CURVE_MAP: Record<string, string> = {
  linear: "linear",
  "monotone-x": "monotoneX",
  "monotone-y": "monotoneY",
  step: "step",
  "step-after": "stepAfter",
  "step-before": "stepBefore",
  basis: "basis",
  cardinal: "cardinal",
  "catmull-rom": "catmullRom",
  natural: "natural",
}

/** Plot marks that draw chrome, not data — skipped when finding the primary mark. */
const DECORATIVE = new Set([
  "frame",
  "gridx",
  "gridy",
  "gridfx",
  "gridfy",
  "axisx",
  "axisy",
  "axisfx",
  "axisfy",
  "rulex",
  "ruley",
  "tip",
  "crosshair",
  "pointer",
  "hexgrid",
  "text",
])

function fieldName(channel: ObservablePlotChannel | undefined): string | undefined {
  return typeof channel === "string" ? channel : undefined
}

function isFn(channel: ObservablePlotChannel | undefined): boolean {
  return typeof channel === "function"
}

/**
 * Whether a field's values look categorical (non-numeric, non-date strings).
 * A continuous-x chart (LineChart/AreaChart) can't position categorical x, so
 * the adapter warns rather than emit a chart that silently draws nothing.
 */
function looksCategorical(data: Datum[] | undefined, field: string | undefined): boolean {
  if (!Array.isArray(data) || !field) return false
  // Inspect the first non-null value of the column.
  for (const d of data) {
    const v = d?.[field]
    if (v == null) continue
    if (typeof v === "number" || v instanceof Date) return false
    // A date-parseable string is fine (a time axis); a plain label is not.
    if (typeof v === "string") return Number.isNaN(Date.parse(v))
    return false
  }
  return false
}

function pushFnWarning(
  warnings: string[],
  channel: ObservablePlotChannel | undefined,
  name: string,
): void {
  if (isFn(channel)) {
    warnings.push(
      `The "${name}" channel is a function accessor, which can't be serialized to a config. ` +
        "Pass a field name (string) instead, or pre-derive the field on your data.",
    )
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

export function fromObservablePlot(
  spec: ObservablePlotSpec,
): ChartConfig & { warnings?: string[] } {
  const warnings: string[] = []

  if (spec.facet || spec.fx || spec.fy) {
    warnings.push(
      'Faceted plots ("facet"/"fx"/"fy") are not supported. Use Semiotic\'s LinkedCharts or render multiple charts.',
    )
  }

  const marks = Array.isArray(spec.marks) ? spec.marks : []
  const dataMarks = marks.filter((m) => m && !DECORATIVE.has(m.type.toLowerCase()))

  if (dataMarks.length === 0) {
    warnings.push("No translatable data mark found in the Plot spec. Defaulting to an empty Scatterplot.")
    return buildConfig("Scatterplot", {}, warnings)
  }
  if (dataMarks.length > 1) {
    warnings.push(
      `Multiple data marks (${dataMarks.map((m) => m.type).join(", ")}); only the first is translated. ` +
        "Layered multi-mark plots aren't supported.",
    )
  }

  const mark = dataMarks[0]
  const opts = mark.options || {}
  const data = mark.data || spec.data
  const props: Datum = {}

  // Layout + titles
  if (typeof spec.width === "number") props.width = spec.width
  if (typeof spec.height === "number") props.height = spec.height
  if (typeof spec.title === "string") props.title = spec.title
  if (spec.x?.label) props.xLabel = spec.x.label
  if (spec.y?.label) props.yLabel = spec.y.label

  // Shared color scheme
  const scheme = spec.color?.scheme ? SCHEME_MAP[spec.color.scheme] : undefined

  // Channel function warnings (these channels are the ones we read)
  pushFnWarning(warnings, opts.x, "x")
  pushFnWarning(warnings, opts.y, "y")
  pushFnWarning(warnings, opts.fill, "fill")
  pushFnWarning(warnings, opts.stroke, "stroke")
  pushFnWarning(warnings, opts.r, "r")

  const x = fieldName(opts.x)
  const y = fieldName(opts.y)
  const fill = fieldName(opts.fill)
  const stroke = fieldName(opts.stroke)
  const colorField = fill || stroke
  const type = mark.type.toLowerCase()

  let component: string

  switch (type) {
    case "line":
    case "liney":
    case "linex": {
      component = "LineChart"
      if (x) props.xAccessor = x
      if (y) props.yAccessor = y
      else warnings.push(`${mark.type} has no explicit y field; provide options.y.`)
      if (looksCategorical(data, x)) {
        warnings.push(
          `The x field "${x}" looks categorical; LineChart uses a continuous x scale, so a ` +
            "categorical x won't position (the line won't draw). Use a numeric/time x, or a bar chart for categories.",
        )
      }
      if (type === "liney" && !x) {
        warnings.push("lineY without an explicit x plots against the row index, which Semiotic doesn't infer. Provide options.x.")
      }
      const lineBy = stroke || fill
      if (lineBy) props.lineBy = lineBy
      applyCurve(opts, props)
      attach(props, data, { colorScheme: scheme })
      break
    }
    case "bary":
    case "bar": {
      component = colorField ? "StackedBarChart" : "BarChart"
      if (x) props.categoryAccessor = x
      if (y) props.valueAccessor = y
      if (colorField) props.stackBy = colorField
      attach(props, data, { colorScheme: scheme })
      break
    }
    case "barx": {
      component = colorField ? "StackedBarChart" : "BarChart"
      props.orientation = "horizontal"
      if (y) props.categoryAccessor = y
      if (x) props.valueAccessor = x
      if (colorField) props.stackBy = colorField
      attach(props, data, { colorScheme: scheme })
      break
    }
    case "dot":
    case "doty":
    case "dotx":
    case "circle": {
      const r = opts.r
      if (typeof r === "string") {
        component = "BubbleChart"
        props.sizeBy = r
      } else {
        component = "Scatterplot"
        if (typeof r === "number") props.pointRadius = r
      }
      if (x) props.xAccessor = x
      if (y) props.yAccessor = y
      attach(props, data, { colorBy: colorField, colorScheme: scheme })
      break
    }
    case "area":
    case "areay":
    case "areax": {
      component = fill && fill !== y ? "StackedAreaChart" : "AreaChart"
      if (x) props.xAccessor = x
      if (y) props.yAccessor = y
      if (looksCategorical(data, x)) {
        warnings.push(
          `The x field "${x}" looks categorical; ${component} uses a continuous x scale, so a ` +
            "categorical x won't position. Use a numeric/time x.",
        )
      }
      if (component === "StackedAreaChart" && fill) props.areaBy = fill
      applyCurve(opts, props)
      attach(props, data, {
        colorBy: component === "StackedAreaChart" ? undefined : colorField,
        colorScheme: scheme,
      })
      break
    }
    case "recty":
    case "rectx":
    case "rect": {
      // A binned rect is a histogram; the binned field is the value.
      component = "Histogram"
      const valueField = type === "rectx" ? x : y || x
      if (valueField) props.valueAccessor = valueField
      if (colorField) props.categoryAccessor = colorField
      attach(props, data, { colorScheme: scheme })
      break
    }
    case "cell":
    case "celly":
    case "cellx": {
      component = "Heatmap"
      if (x) props.xAccessor = x
      if (y) props.yAccessor = y
      if (colorField) props.valueAccessor = colorField
      attach(props, data)
      break
    }
    case "tick":
    case "tickx":
    case "ticky": {
      component = "DotPlot"
      // tickX: x is the value, y the category; tickY: the reverse.
      if (type === "tickx") {
        if (y) props.categoryAccessor = y
        if (x) props.valueAccessor = x
        props.orientation = "horizontal"
      } else {
        if (x) props.categoryAccessor = x
        if (y) props.valueAccessor = y
      }
      attach(props, data, { colorBy: colorField, colorScheme: scheme })
      break
    }
    default: {
      warnings.push(
        `Plot mark "${mark.type}" has no faithful Semiotic equivalent in this adapter. ` +
          "Defaulting to a Scatterplot of x/y; verify the result or file for support.",
      )
      component = "Scatterplot"
      if (x) props.xAccessor = x
      if (y) props.yAccessor = y
      attach(props, data, { colorBy: colorField, colorScheme: scheme })
    }
  }

  // Carry Plot's scale types onto the continuous-axis XY charts (time/log).
  if (CONTINUOUS_XY.has(component)) {
    const xType = scaleType(spec.x?.type)
    const yType = scaleType(spec.y?.type)
    if (xType) props.xScaleType = xType
    if (yType) props.yScaleType = yType
  }

  return buildConfig(component, props, warnings)
}

/** XY components with continuous x/y scales that honor xScaleType/yScaleType. */
const CONTINUOUS_XY = new Set([
  "LineChart", "AreaChart", "StackedAreaChart", "Scatterplot", "BubbleChart",
])

/** Map a Plot scale type to a Semiotic scale type, or undefined to leave default. */
function scaleType(type: string | undefined): "time" | "log" | undefined {
  if (type === "time" || type === "utc") return "time"
  if (type === "log") return "log"
  return undefined
}

// ── Internal helpers ───────────────────────────────────────────────────────

function applyCurve(opts: ObservablePlotMarkOptions, props: Datum): void {
  if (opts.curve && CURVE_MAP[opts.curve]) props.curve = CURVE_MAP[opts.curve]
}

/** Attach data, an optional colorBy field, and an optional color scheme to props. */
function attach(
  props: Datum,
  data: Datum[] | undefined,
  color: { colorBy?: string; colorScheme?: string } = {},
): void {
  if (Array.isArray(data)) props.data = data
  if (color.colorBy) props.colorBy = color.colorBy
  if (color.colorScheme) props.colorScheme = color.colorScheme
}

function buildConfig(
  component: string,
  props: Datum,
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
    for (const w of warnings) {
      console.warn(`[semiotic/fromObservablePlot] ${w}`)
    }
  }
  return config
}
