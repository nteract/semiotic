import type { Datum } from "../charts/shared/datumTypes"
import { resolveAccessor, resolveRawAccessor } from "../stream/accessorUtils"
/**
 * describeChart — generate a layered natural-language description of a chart
 * from its `(component, props)` config, following Lundgard & Satyanarayan's
 * four-level model of semantic content (IEEE VIS 2021):
 *
 *   L1 (encoding)   — chart type and what's mapped to which channel.
 *   L2 (statistics) — ranges, mean, extrema (the level blind/low-vision
 *                     readers rank *most* useful, alongside L3).
 *   L3 (trends)     — overall direction and notable shape over an ordered axis.
 *
 * (L4, domain/contextual meaning, requires knowledge the config doesn't carry —
 * that's the author's `summary` or an LLM's job, not this function's.)
 *
 * Pure, SSR-safe, dependency-light. Wired into ChartContainer as an opt-in
 * full-accessibility affordance (see ChartContainer's `describe` prop); also
 * usable directly and surfaced by the accessibility audit.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DescribeLevel = "l1" | "l2" | "l3"

export interface DescribeChartResult {
  /** The selected levels joined into one description (what you'd feed a summary). */
  text: string
  /** Each level on its own, so callers can pick verbosity. */
  levels: { l1?: string; l2?: string; l3?: string }
}

export interface DescribeChartOptions {
  /** Which semantic levels to include. Default ["l1","l2","l3"]. */
  levels?: DescribeLevel[]
  /** Locale for number formatting. Default "en". */
  locale?: string
}

// ---------------------------------------------------------------------------
// Chart-kind phrasing + role resolution
// ---------------------------------------------------------------------------

const KIND_PHRASE: Record<string, string> = {
  LineChart: "line chart", AreaChart: "area chart", StackedAreaChart: "stacked area chart",
  DifferenceChart: "difference chart", Scatterplot: "scatter plot", BubbleChart: "bubble chart",
  ConnectedScatterplot: "connected scatter plot", QuadrantChart: "quadrant chart",
  MultiAxisLineChart: "dual-axis line chart", CandlestickChart: "candlestick chart",
  Heatmap: "heatmap", MinimapChart: "line chart",
  BarChart: "bar chart", StackedBarChart: "stacked bar chart", GroupedBarChart: "grouped bar chart",
  DotPlot: "dot plot", Histogram: "histogram", BoxPlot: "box plot", ViolinPlot: "violin plot",
  RidgelinePlot: "ridgeline plot", SwarmPlot: "swarm plot",
  PieChart: "pie chart", DonutChart: "donut chart", FunnelChart: "funnel chart",
  GaugeChart: "gauge", LikertChart: "Likert chart", SwimlaneChart: "swimlane chart",
  ForceDirectedGraph: "network graph", SankeyDiagram: "Sankey diagram", ProcessSankey: "temporal Sankey diagram",
  ChordDiagram: "chord diagram", TreeDiagram: "tree diagram", Treemap: "treemap",
  CirclePack: "circle-packing chart", OrbitDiagram: "orbit diagram",
  ChoroplethMap: "choropleth map", ProportionalSymbolMap: "proportional-symbol map",
  FlowMap: "flow map", DistanceCartogram: "distance cartogram",
  BigNumber: "single value",
}

const XY_FAMILY = new Set([
  "LineChart", "AreaChart", "StackedAreaChart", "DifferenceChart", "Scatterplot",
  "BubbleChart", "ConnectedScatterplot", "QuadrantChart", "MultiAxisLineChart", "MinimapChart",
])
const BAR_FAMILY = new Set([
  "BarChart", "StackedBarChart", "GroupedBarChart", "DotPlot",
])
const PART_TO_WHOLE = new Set(["PieChart", "DonutChart", "FunnelChart"])
const DISTRIBUTION = new Set(["Histogram", "BoxPlot", "ViolinPlot", "RidgelinePlot", "SwarmPlot"])
const NETWORK = new Set(["ForceDirectedGraph", "SankeyDiagram", "ProcessSankey", "ChordDiagram"])

function humanizeComponent(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
}
function kindPhrase(component: string): string {
  return KIND_PHRASE[component] || `${humanizeComponent(component)} chart`
}

/** The measure (quantitative) and dimension (categorical/ordered) accessors, by family. */
function roles(component: string, props: Datum): { measure?: string; measureFallback: string; dimension?: string; dimensionFallback: string } {
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

function seriesField(props: Datum): string | undefined {
  for (const k of ["lineBy", "areaBy", "stackBy", "groupBy", "colorBy"]) {
    const v = props[k]
    if (typeof v === "string" && v) return v
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Build a number formatter — compact (6.5M) for large magnitudes, plain
 *  otherwise. Exported so the navigation tree formats values identically. */
export function chartValueFormatter(locale = "en"): (n: number) => string {
  let compact: Intl.NumberFormat, plain: Intl.NumberFormat
  try {
    compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 })
    plain = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
  } catch {
    compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
    plain = new Intl.NumberFormat("en", { maximumFractionDigits: 2 })
  }
  return (n: number): string => {
    if (!Number.isFinite(n)) return String(n)
    return Math.abs(n) >= 10000 ? compact.format(n) : plain.format(n)
  }
}

/** Format a dimension value (the label at an extremum) — dates as ISO day, numbers compactly. */
function fmtDim(v: unknown, fmtNum: (n: number) => string): string {
  if (v == null) return "—"
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === "number") return fmtNum(v)
  return String(v)
}

// ---------------------------------------------------------------------------
// Statistics over the measure
// ---------------------------------------------------------------------------

interface MeasureStats {
  count: number
  min: number
  max: number
  mean: number
  minLabel: string
  maxLabel: string
  first: number
  last: number
  firstLabel: string
  lastLabel: string
  /** Index (among finite measures) of min/max — lets us tell interior extrema from endpoints. */
  minIndex: number
  maxIndex: number
}

function computeStats(
  data: Datum[],
  getMeasure: (d: Datum) => number,
  getDim: (d: Datum) => unknown,
  fmtNum: (n: number) => string
): MeasureStats | null {
  let count = 0, sum = 0
  let min = Infinity, max = -Infinity
  let minRow: Datum | null = null, maxRow: Datum | null = null
  let minIndex = 0, maxIndex = 0
  let firstRow: Datum | null = null, lastRow: Datum | null = null
  let first = NaN, last = NaN
  for (const d of data) {
    const m = getMeasure(d)
    if (!Number.isFinite(m)) continue
    if (count === 0) { first = m; firstRow = d }
    last = m; lastRow = d
    if (m < min) { min = m; minRow = d; minIndex = count }
    if (m > max) { max = m; maxRow = d; maxIndex = count }
    count++
    sum += m
  }
  if (count === 0) return null
  return {
    count, min, max, mean: sum / count,
    minLabel: fmtDim(minRow != null ? getDim(minRow) : null, fmtNum),
    maxLabel: fmtDim(maxRow != null ? getDim(maxRow) : null, fmtNum),
    first, last,
    firstLabel: fmtDim(firstRow != null ? getDim(firstRow) : null, fmtNum),
    lastLabel: fmtDim(lastRow != null ? getDim(lastRow) : null, fmtNum),
    minIndex, maxIndex,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a layered (L1/L2/L3) natural-language description of a chart config.
 * Best for XY, bar, part-to-whole, and distribution families; degrades to an
 * L1-only description (chart type + structure) for network/hierarchy/geo/value.
 */
export function describeChart(
  component: string,
  props: Datum,
  options: DescribeChartOptions = {}
): DescribeChartResult {
  const want = new Set<DescribeLevel>(options.levels ?? ["l1", "l2", "l3"])
  const fmtNum = chartValueFormatter(options.locale ?? "en")
  const kind = kindPhrase(component)
  const data = Array.isArray(props.data) ? (props.data as Datum[]) : null
  const series = seriesField(props)

  const { measure, measureFallback, dimension, dimensionFallback } = roles(component, props)
  const measureName = measure || measureFallback
  const dimensionName = dimension || dimensionFallback

  const levels: { l1?: string; l2?: string; l3?: string } = {}

  // ── L1: encoding ───────────────────────────────────────────────────────
  if (want.has("l1")) {
    if (XY_FAMILY.has(component) || BAR_FAMILY.has(component)) {
      levels.l1 = `A ${kind} of ${measureName} by ${dimensionName}` + (series ? `, split by ${series}.` : ".")
    } else if (PART_TO_WHOLE.has(component)) {
      levels.l1 = `A ${kind} showing ${measureName} across ${dimensionName} categories.`
    } else if (DISTRIBUTION.has(component)) {
      levels.l1 = `A ${kind} of the distribution of ${measureName}` + (series ? ` by ${series}.` : ".")
    } else if (NETWORK.has(component)) {
      const nNodes = Array.isArray(props.nodes) ? props.nodes.length : undefined
      const nEdges = Array.isArray(props.edges) ? props.edges.length : undefined
      const parts = [nNodes != null ? `${nNodes} nodes` : null, nEdges != null ? `${nEdges} edges` : null].filter(Boolean)
      levels.l1 = `A ${kind}${parts.length ? ` with ${parts.join(" and ")}` : ""}.`
    } else if (component === "BigNumber") {
      const label = typeof props.label === "string" ? props.label : measureName
      levels.l1 = `A single value${label ? ` for ${label}` : ""}.`
    } else {
      levels.l1 = `A ${kind}.`
    }
  }

  // Families where a quantitative measure makes L2/L3 meaningful.
  const statsFamily = XY_FAMILY.has(component) || BAR_FAMILY.has(component) ||
    PART_TO_WHOLE.has(component) || DISTRIBUTION.has(component)

  // Stats power both L2 and L3; compute once if we have data + a measure.
  let stats: MeasureStats | null = null
  if ((want.has("l2") || want.has("l3")) && statsFamily && data && data.length > 0) {
    const getMeasure = resolveAccessor(measure, measureFallback)
    const getDim = resolveRawAccessor(dimension, dimensionFallback)
    stats = computeStats(data, getMeasure, getDim, fmtNum)
  }

  // ── L2: statistics (only for measure-bearing families) ───────────────────
  if (want.has("l2") && statsFamily) {
    if (!data || data.length === 0) {
      levels.l2 = "No data is loaded yet."
    } else if (stats) {
      if (PART_TO_WHOLE.has(component)) {
        levels.l2 = `${stats.count} segments totaling ${fmtNum(sumOf(stats))}. Largest is ${stats.maxLabel} at ${fmtNum(stats.max)}; smallest is ${stats.minLabel} at ${fmtNum(stats.min)}.`
      } else {
        levels.l2 = `${measureName} ranges from ${fmtNum(stats.min)} (${stats.minLabel}) to ${fmtNum(stats.max)} (${stats.maxLabel}), with a mean of ${fmtNum(stats.mean)} across ${stats.count} points.`
      }
    }
  }

  // ── L3: trend (only meaningful over an ordered dimension) ────────────────
  if (want.has("l3") && stats && (XY_FAMILY.has(component))) {
    levels.l3 = trendSentence(stats, measureName, fmtNum)
  } else if (want.has("l3") && stats && BAR_FAMILY.has(component)) {
    levels.l3 = `The highest ${dimensionName} is ${stats.maxLabel} and the lowest is ${stats.minLabel}.`
  }

  const order: DescribeLevel[] = ["l1", "l2", "l3"]
  const text = order
    .filter((l) => want.has(l) && levels[l])
    .map((l) => levels[l]!)
    .join(" ")

  return { text, levels }
}

/** Total of the measure across segments (part-to-whole) — recompute from stats' mean×count. */
function sumOf(stats: MeasureStats): number {
  return stats.mean * stats.count
}

/** Describe the dominant shape of an ordered series: peak/valley shapes take
 *  priority over net direction, since "rose then crashed" is more salient than
 *  "net down". Falls back to monotonic rise/fall and flat. */
function trendSentence(stats: MeasureStats, measureName: string, fmtNum: (n: number) => string): string {
  const { first, last, min, max, maxLabel, minLabel, firstLabel, lastLabel, minIndex, maxIndex, count } = stats
  const range = max - min
  const delta = last - first
  if (range === 0) {
    return `${capitalize(measureName)} is constant at ${fmtNum(first)} across the series.`
  }
  // Relative-flatness guard: if the whole series barely moves compared to its
  // own magnitude, call it flat before looking for a "peak" in the noise
  // (otherwise a 100→101→100 wiggle reads as a dramatic peak).
  if (range / (Math.abs(stats.mean) || 1) < 0.04) {
    return `${capitalize(measureName)} ends roughly where it started (${fmtNum(first)} at ${firstLabel} to ${fmtNum(last)} at ${lastLabel}), ranging between ${fmtNum(min)} and ${fmtNum(max)}.`
  }
  const maxInterior = maxIndex > 0 && maxIndex < count - 1
  const minInterior = minIndex > 0 && minIndex < count - 1
  // Prominence of an interior extremum above/below both endpoints, as a share of range.
  const peakProminence = (max - Math.max(first, last)) / range
  const valleyProminence = (Math.min(first, last) - min) / range

  // Peak shape: climbs to an interior high, then comes down.
  if (maxInterior && peakProminence > 0.15) {
    return `Overall ${measureName} climbs to a peak of ${fmtNum(max)} (${maxLabel}), then falls to ${fmtNum(last)} (${lastLabel}).`
  }
  // Valley shape: drops to an interior low, then recovers.
  if (minInterior && valleyProminence > 0.15) {
    return `Overall ${measureName} drops to a low of ${fmtNum(min)} (${minLabel}), then recovers to ${fmtNum(last)} (${lastLabel}).`
  }
  // Roughly flat net movement.
  if (Math.abs(delta) / range < 0.05) {
    return `${capitalize(measureName)} ends roughly where it started (${fmtNum(first)} at ${firstLabel} to ${fmtNum(last)} at ${lastLabel}), ranging between ${fmtNum(min)} and ${fmtNum(max)}.`
  }
  // Monotonic-ish net direction.
  if (delta > 0) {
    return maxIndex === count - 1
      ? `Overall ${measureName} rises from ${fmtNum(first)} (${firstLabel}) to a peak of ${fmtNum(last)} (${lastLabel}).`
      : `Overall ${measureName} rises from ${fmtNum(first)} (${firstLabel}) to ${fmtNum(last)} (${lastLabel}), after peaking at ${fmtNum(max)} (${maxLabel}).`
  }
  return minIndex === count - 1
    ? `Overall ${measureName} falls from ${fmtNum(first)} (${firstLabel}) to a low of ${fmtNum(last)} (${lastLabel}).`
    : `Overall ${measureName} falls from ${fmtNum(first)} (${firstLabel}) to ${fmtNum(last)} (${lastLabel}), after dipping to ${fmtNum(min)} (${minLabel}).`
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}
