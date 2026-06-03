import type { Datum } from "../charts/shared/datumTypes"
import { resolveAccessor, resolveRawAccessor } from "../stream/accessorUtils"
import type { ChartCapability, ChartFamily } from "./chartCapabilityTypes"
import type { IntentId } from "./intents"
import type { AudienceProfile } from "./audienceProfile"
import { XY_FAMILY, BAR_FAMILY, PART_TO_WHOLE, DISTRIBUTION, roles, seriesField, fmtDim } from "./chartRoles"
/**
 * describeChart — generate a layered natural-language description of a chart
 * from its `(component, props)` config, following Lundgard & Satyanarayan's
 * four-level model of semantic content (IEEE VIS 2021):
 *
 *   L1 (encoding)   — chart type and what's mapped to which channel.
 *   L2 (statistics) — ranges, mean, extrema (the level blind/low-vision
 *                     readers rank *most* useful, alongside L3).
 *   L3 (trends)     — overall direction and notable shape over an ordered axis.
 *   L4 (intent)     — the *illocutionary* sentence: what communicative act the
 *                     chart performs and which feature it asks the reader to act
 *                     on ("This is an alerting chart; the May spike warrants a
 *                     closer look."). Opt-in — only emitted when the caller
 *                     supplies the chart's capability descriptor (or an explicit
 *                     communicative act). Without that intent metadata, the
 *                     domain meaning stays the author's `summary` or an LLM's
 *                     job, as before.
 *
 * Pure, SSR-safe, dependency-light (the new capability/audience inputs are
 * type-only — no runtime registry pull). Wired into ChartContainer as an opt-in
 * full-accessibility affordance (see ChartContainer's `describe` prop); also
 * usable directly, surfaced by the accessibility audit, and composed by
 * `buildReaderGrounding` into the agent-reader payload.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DescribeLevel = "l1" | "l2" | "l3" | "l4"

/**
 * The communicative act a chart performs — its illocutionary force, the verb
 * behind "what is this chart *doing*?". Derived from the dominant intent (or
 * the chart family as a fallback) and used to phrase the L4 sentence.
 */
export type CommunicativeAct =
  | "alerting"       // surfacing anomalies / change — demands a closer look
  | "tracking"       // a trajectory over an ordered axis — read for direction
  | "comparing"      // values across series/categories — read for who leads
  | "ranking"        // an ordering — read top to bottom
  | "apportioning"   // shares of a whole — read each part's contribution
  | "characterizing" // a distribution — read for spread and shape
  | "relating"       // two variables — read for whether they move together
  | "tracing"        // movement between states — follow the flow
  | "nesting"        // parent/child structure — read nested totals
  | "locating"       // values bound to place — read by location
  | "presenting"     // a single focal value — read the headline number

/**
 * Lightweight intent context for the L4 sentence. Either hand `describeChart`
 * a full {@link ChartCapability} (its static `intentScores` are read; function
 * scorers are skipped since no data profile is in scope here) or this resolved
 * shape — e.g. a `Suggestion`'s already-resolved `{ family, intentScores }`,
 * which is the most precise source.
 */
export interface DescribeCapabilityContext {
  /** Chart family — anchors the communicative act when intent scores are absent. */
  family?: ChartFamily
  /** Per-intent scores (0..5), already resolved. The top-scoring intent picks the act. */
  intentScores?: Partial<Record<IntentId, number>>
  /** Explicit override — skips intent/family inference entirely. */
  act?: CommunicativeAct
}

export interface DescribeChartResult {
  /** The selected levels joined into one description (what you'd feed a summary). */
  text: string
  /** Each level on its own, so callers can pick verbosity. */
  levels: { l1?: string; l2?: string; l3?: string; l4?: string }
  /**
   * The author's marked features, as a sentence — present only when the chart
   * carries `annotations`. An annotation is author intent in its purest form,
   * so it leads `text` ahead of the auto-derived L1–L3: a non-visual or agent
   * reader hears what the author chose to call out first. Provenance-aware —
   * an AI- or watcher-authored note is qualified as such.
   */
  annotations?: string
}

export interface DescribeChartOptions {
  /**
   * Which semantic levels to include. Default ["l1","l2","l3"]. L4 is appended
   * automatically when `capability` (or `capability.act`) is provided and
   * `levels` is left at the default; pass `levels` explicitly to override.
   */
  levels?: DescribeLevel[]
  /** Locale for number formatting. Default "en". */
  locale?: string
  /**
   * Intent context that powers the L4 illocutionary sentence — a chart's
   * capability descriptor or a resolved {@link DescribeCapabilityContext}.
   * Closes the L1–L3 → L4 gap by joining the *production*-side intent metadata
   * (which already lives in each `*.capability.ts`) to the *reception*-side
   * description.
   */
  capability?: ChartCapability | DescribeCapabilityContext
  /**
   * Audience profile — tunes the L4 sentence for reception. When the chart's
   * familiarity for this audience is low, L4 appends a brief orienting nudge so
   * an unfamiliar reader leans on the description.
   */
  audience?: AudienceProfile
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

// XY_FAMILY / BAR_FAMILY / PART_TO_WHOLE / DISTRIBUTION + roles/seriesField/fmtDim
// are shared with navigationTree via ./chartRoles. NETWORK is description-only.
const NETWORK = new Set(["ForceDirectedGraph", "SankeyDiagram", "ProcessSankey", "ChordDiagram"])

function humanizeComponent(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
}
function kindPhrase(component: string): string {
  return KIND_PHRASE[component] || `${humanizeComponent(component)} chart`
}

// ---------------------------------------------------------------------------
// Communicative act (powers the L4 illocutionary sentence)
// ---------------------------------------------------------------------------

// Scatter-shaped XY charts are about relationship, not trajectory.
const SCATTER = new Set([
  "Scatterplot", "BubbleChart", "ConnectedScatterplot", "QuadrantChart", "ScatterplotMatrix",
])

/** Map a built-in intent to the communicative act it implies. */
const INTENT_ACT: Partial<Record<IntentId, CommunicativeAct>> = {
  "outlier-detection": "alerting",
  "change-detection": "alerting",
  "trend": "tracking",
  "composition-over-time": "apportioning",
  "compare-series": "comparing",
  "compare-categories": "comparing",
  "rank": "ranking",
  "part-to-whole": "apportioning",
  "distribution": "characterizing",
  "correlation": "relating",
  "flow": "tracing",
  "hierarchy": "nesting",
  "geo": "locating",
}

/** Family → default act, used when no intent scores are available. */
const FAMILY_ACT: Record<ChartFamily, CommunicativeAct> = {
  "time-series": "tracking",
  "categorical": "comparing",
  "distribution": "characterizing",
  "relationship": "relating",
  "flow": "tracing",
  "network": "tracing",
  "hierarchy": "nesting",
  "geo": "locating",
  "realtime": "tracking",
  "value": "presenting",
  "custom": "presenting",
}

// When two intents tie on score, the chart's *primary* purpose should win over
// a detection reading — a plain line is "tracking", and only flips to "alerting"
// when an outlier/change scorer strictly out-scores the trend.
const INTENT_TIEBREAK: IntentId[] = [
  "trend", "compare-series", "compare-categories", "rank", "part-to-whole",
  "distribution", "correlation", "flow", "hierarchy", "geo",
  "composition-over-time", "change-detection", "outlier-detection",
]

/** Adjective placed before "chart" in the L4 frame ("an alerting chart"). */
const ACT_LABEL: Record<CommunicativeAct, string> = {
  alerting: "alerting",
  tracking: "trend",
  comparing: "comparison",
  ranking: "ranking",
  apportioning: "composition",
  characterizing: "distribution",
  relating: "correlation",
  tracing: "flow",
  nesting: "hierarchy",
  locating: "locator",
  presenting: "single-value",
}

/** The communicative act a built-in intent implies, or undefined if unknown. */
export function communicativeActForIntent(intent: IntentId): CommunicativeAct | undefined {
  return INTENT_ACT[intent]
}

/** Pick the highest-scoring intent, breaking ties by primary-purpose priority. */
function dominantIntent(scores: Partial<Record<IntentId, number>>): IntentId | undefined {
  let best: IntentId | undefined
  let bestScore = 0
  for (const [intent, s] of Object.entries(scores) as Array<[IntentId, number]>) {
    if (typeof s !== "number" || !(s > 0)) continue
    if (s > bestScore) { best = intent; bestScore = s; continue }
    if (s === bestScore && best !== undefined) {
      const a = INTENT_TIEBREAK.indexOf(intent)
      const b = INTENT_TIEBREAK.indexOf(best)
      // Lower priority index wins; unknown intents (-1) never displace a known one.
      if (a !== -1 && (b === -1 || a < b)) best = intent
    }
  }
  return best
}

/** Act implied by the component's own family classification (no descriptor needed). */
function componentAct(component: string): CommunicativeAct | undefined {
  if (PART_TO_WHOLE.has(component) || component === "StackedAreaChart") return "apportioning"
  if (SCATTER.has(component)) return "relating"
  if (BAR_FAMILY.has(component)) return "comparing"
  if (DISTRIBUTION.has(component)) return "characterizing"
  if (XY_FAMILY.has(component)) return "tracking"
  if (NETWORK.has(component)) return "tracing"
  if (component === "BigNumber") return "presenting"
  return undefined
}

/** Normalize a full ChartCapability or a context object to a resolved context. */
function normalizeCapabilityContext(
  cap: ChartCapability | DescribeCapabilityContext | undefined
): DescribeCapabilityContext | undefined {
  if (!cap) return undefined
  // A ChartCapability carries `fits`/`buildProps`; the context shape does not.
  if ("fits" in cap || "buildProps" in cap) {
    const full = cap as ChartCapability
    const scores: Partial<Record<IntentId, number>> = {}
    for (const [intent, scorer] of Object.entries(full.intentScores) as Array<[IntentId, unknown]>) {
      // Only static numeric scorers can be read without a data profile.
      if (typeof scorer === "number" && Number.isFinite(scorer)) scores[intent] = scorer
    }
    return {
      family: full.family,
      intentScores: Object.keys(scores).length ? scores : undefined,
    }
  }
  return cap as DescribeCapabilityContext
}

/**
 * Resolve the communicative act for a chart from (in priority order) an explicit
 * act, the dominant resolved intent, the declared family, or the component's own
 * family classification. Returns undefined only when nothing identifies it.
 */
export function resolveCommunicativeAct(
  component: string,
  context: ChartCapability | DescribeCapabilityContext | undefined
): CommunicativeAct | undefined {
  const ctx = normalizeCapabilityContext(context)
  if (ctx?.act) return ctx.act
  if (ctx?.intentScores) {
    const top = dominantIntent(ctx.intentScores)
    // Only trust the dominant intent when it's a *strong* fit (≥3, the same bar
    // `buildReasons` uses). A weak top score means we're looking at leftover
    // static scorers (a chart's primary intents are often function scorers we
    // can't evaluate here) — the family is the more honest signal in that case.
    if (top && INTENT_ACT[top] && (ctx.intentScores[top] ?? 0) >= 3) return INTENT_ACT[top]
  }
  if (ctx?.family) return FAMILY_ACT[ctx.family]
  return componentAct(component)
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
// ---------------------------------------------------------------------------
// Author annotations — the reception side of author intent
// ---------------------------------------------------------------------------

// Human phrasing per annotation type, with a leading article so the sentence
// reads naturally ("a callout", "an enclosure").
const ANNOTATION_KIND: Record<string, string> = {
  "y-threshold": "a threshold line",
  "x-threshold": "a threshold line",
  band: "a highlighted band",
  label: "a label",
  callout: "a callout",
  "callout-circle": "a callout",
  "callout-rect": "a callout",
  text: "a text note",
  bracket: "a bracket",
  enclose: "an enclosure",
  "rect-enclose": "an enclosure",
  highlight: "a highlight",
  widget: "a widget",
  trend: "a trend line",
  envelope: "an envelope",
  "anomaly-band": "an anomaly band",
  forecast: "a forecast",
  "category-highlight": "a category highlight",
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ""
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
}

/** Provenance-aware qualifier: an AI- or watcher-authored note reads
 *  differently from a hand-placed one — surfacing that is the reception side of
 *  the provenance the annotation carries. Returns a phrase that *replaces* the
 *  kind's leading article ("a callout" → "an AI-suggested callout"). */
function annotationQualifier(ann: Datum): string {
  const prov = ann.provenance && typeof ann.provenance === "object"
    ? (ann.provenance as { authorKind?: string; source?: string; basis?: string })
    : null
  const who = prov?.authorKind ?? prov?.source ?? prov?.basis
  if (who === "watcher") return "a watcher-flagged "
  if (who === "agent" || who === "ai" || who === "llm-inference") return "an AI-suggested "
  return ""
}

/**
 * Summarize the author-placed annotations as one sentence. Returns undefined
 * when the chart carries none. Caps the enumerated list at five and rolls the
 * remainder into "and N more" so a heavily-annotated chart stays readable.
 */
function annotationSentence(props: Datum): string | undefined {
  const raw = Array.isArray(props.annotations) ? (props.annotations as Datum[]) : null
  if (!raw || raw.length === 0) return undefined
  const items = raw.filter((a): a is Datum => !!a && typeof a === "object")
  if (items.length === 0) return undefined

  const phrases = items.map((a) => {
    const type = typeof a.type === "string" ? a.type : "annotation"
    const baseKind = ANNOTATION_KIND[type] || "an annotation"
    const qualifier = annotationQualifier(a)
    const kind = qualifier ? qualifier + baseKind.replace(/^an? /, "") : baseKind
    const label = typeof a.label === "string" ? a.label : typeof a.title === "string" ? a.title : undefined
    return label ? `${kind} labeled "${label}"` : kind
  })

  const shown = phrases.slice(0, 5)
  const more = phrases.length - shown.length
  const list = joinList(shown) + (more > 0 ? `, and ${more} more` : "")
  const n = items.length
  return `The author has marked ${n === 1 ? "one feature" : `${n} features`} on this chart: ${list}.`
}

export function describeChart(
  component: string,
  props: Datum,
  options: DescribeChartOptions = {}
): DescribeChartResult {
  const explicitLevels = options.levels !== undefined
  const want = new Set<DescribeLevel>(options.levels ?? ["l1", "l2", "l3"])
  // L4 is opt-in: auto-append when intent context is supplied and `levels`
  // wasn't pinned, so "pass a capability → get L4" is ergonomic without
  // changing the default L1–L3 output every existing caller relies on.
  if (!explicitLevels && options.capability) want.add("l4")

  const fmtNum = chartValueFormatter(options.locale ?? "en")
  const kind = kindPhrase(component)
  const data = Array.isArray(props.data) ? (props.data as Datum[]) : null
  const series = seriesField(props)

  const { measure, measureFallback, dimension, dimensionFallback } = roles(component, props)
  // Only string accessors are human-readable labels. Function accessors (common
  // in Semiotic) are truthy but would interpolate their source into the prose —
  // fall back to the generic label instead. (The raw accessor still flows to
  // `resolveAccessor` below for value extraction.)
  const measureName = typeof measure === "string" && measure ? measure : measureFallback
  const dimensionName = typeof dimension === "string" && dimension ? dimension : dimensionFallback

  const levels: { l1?: string; l2?: string; l3?: string; l4?: string } = {}

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
      const parts = [
        nNodes != null ? `${nNodes} ${plural(nNodes, "node")}` : null,
        nEdges != null ? `${nEdges} ${plural(nEdges, "edge")}` : null,
      ].filter(Boolean)
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

  // Stats power L2, L3, and the L4 directive; compute once if we have data + a measure.
  let stats: MeasureStats | null = null
  if ((want.has("l2") || want.has("l3") || want.has("l4")) && statsFamily && data && data.length > 0) {
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

  // ── L4: intent / communicative act (the illocutionary sentence) ──────────
  if (want.has("l4")) {
    const act = resolveCommunicativeAct(component, options.capability)
    if (act) {
      levels.l4 = l4Sentence(act, component, props, stats, measureName, dimensionName, fmtNum, options.audience)
    }
  }

  const order: DescribeLevel[] = ["l1", "l2", "l3", "l4"]
  const levelText = order
    .filter((l) => want.has(l) && levels[l])
    .map((l) => levels[l]!)
    .join(" ")

  // An author-placed annotation is intent in its purest form, so it leads the
  // description ahead of the auto-derived levels. Only present when the chart
  // actually carries annotations — every existing (un-annotated) caller is
  // unaffected.
  const annotations = annotationSentence(props)
  const text = annotations ? `${annotations} ${levelText}`.trim() : levelText

  return { text, levels, ...(annotations ? { annotations } : {}) }
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

// ---------------------------------------------------------------------------
// L4 — the illocutionary sentence
// ---------------------------------------------------------------------------

/**
 * Compose the L4 sentence: a frame naming the communicative act ("This is an
 * alerting chart") plus a directive clause that points the reader at the
 * feature the act asks them to act on ("the peak of 9,100 at March is the point
 * to investigate"), optionally followed by a reception nudge for an audience
 * unfamiliar with the chart type.
 */
function l4Sentence(
  act: CommunicativeAct,
  component: string,
  props: Datum,
  stats: MeasureStats | null,
  measureName: string,
  dimensionName: string,
  fmtNum: (n: number) => string,
  audience: AudienceProfile | undefined,
): string {
  const label = ACT_LABEL[act]
  const article = /^[aeiou]/i.test(label) ? "an" : "a"

  let frame: string
  let directive: string
  switch (act) {
    case "locating":
      frame = "This is a map"
      directive = "read values by location"
      break
    case "presenting": {
      const focal = typeof props.label === "string" && props.label ? props.label : measureName
      frame = "This is a single-value display"
      directive = `read ${focal} as the headline number`
      break
    }
    case "tracing":
      frame = `This is ${article} ${label} chart`
      directive = "follow the movement between states"
      break
    case "nesting":
      frame = `This is ${article} ${label} chart`
      directive = "read it for nested structure and how children sum into their parents"
      break
    case "relating":
      frame = `This is ${article} ${label} chart`
      directive = `read it for whether ${dimensionName} and ${measureName} move together`
      break
    default:
      frame = `This is ${article} ${label} chart`
      directive = directiveFor(act, stats, measureName, dimensionName, fmtNum, component)
  }

  return `${frame}; ${directive}.${audienceNudge(component, audience)}`
}

/** Directive clause for the stats-bearing acts, falling back to a generic
 *  phrasing when no measure statistics are available (e.g. push mode). */
function directiveFor(
  act: CommunicativeAct,
  stats: MeasureStats | null,
  m: string,
  d: string,
  fmtNum: (n: number) => string,
  component: string,
): string {
  if (!stats) {
    switch (act) {
      case "alerting": return "watch for points that break from the rest"
      case "tracking": return `read it for the overall direction of ${m}`
      case "comparing": return `compare ${m} across ${d}`
      case "ranking": return `read it top to bottom by ${m}`
      case "apportioning": return `read each ${d}'s share of the whole`
      case "characterizing": return `read it for the spread and shape of ${m}`
      default: return "read the highlighted features"
    }
  }
  switch (act) {
    case "alerting": return alertingDirective(stats, fmtNum, component)
    case "tracking":
      return `read it for the trajectory of ${m}, which ${netDirection(stats)} from ${fmtNum(stats.first)} (${stats.firstLabel}) to ${fmtNum(stats.last)} (${stats.lastLabel})`
    case "comparing":
      return `compare ${m} across ${d}; ${stats.maxLabel} leads at ${fmtNum(stats.max)}`
    case "ranking":
      return `read it top to bottom by ${m}; ${stats.maxLabel} ranks highest at ${fmtNum(stats.max)}`
    case "apportioning": {
      const total = stats.mean * stats.count
      const pct = total > 0 ? Math.round((stats.max / total) * 100) : null
      return `read each ${d}'s share of the ${fmtNum(total)} total; ${stats.maxLabel} is the largest at ${fmtNum(stats.max)}${pct != null ? ` (${pct}%)` : ""}`
    }
    case "characterizing":
      return `read it for the spread of ${m}, from ${fmtNum(stats.min)} to ${fmtNum(stats.max)}`
    default:
      return "read the highlighted features"
  }
}

/** Point an alerting chart's reader at the most divergent feature. */
function alertingDirective(stats: MeasureStats, fmtNum: (n: number) => string, component: string): string {
  if (BAR_FAMILY.has(component) || PART_TO_WHOLE.has(component)) {
    return `${stats.maxLabel} stands out at ${fmtNum(stats.max)} — check it first`
  }
  const { first, last, min, max, minLabel, maxLabel, lastLabel, minIndex, maxIndex, count } = stats
  const range = max - min
  if (range > 0) {
    const maxInterior = maxIndex > 0 && maxIndex < count - 1
    const minInterior = minIndex > 0 && minIndex < count - 1
    const peakProminence = (max - Math.max(first, last)) / range
    const valleyProminence = (Math.min(first, last) - min) / range
    if (maxInterior && peakProminence > 0.15) {
      return `the peak of ${fmtNum(max)} at ${maxLabel} is the point to investigate`
    }
    if (minInterior && valleyProminence > 0.15) {
      return `the dip to ${fmtNum(min)} at ${minLabel} is the point to investigate`
    }
    if (last >= max) return `the climb to ${fmtNum(last)} at ${lastLabel} warrants a closer look`
    if (last <= min) return `the drop to ${fmtNum(last)} at ${lastLabel} warrants a closer look`
  }
  return `the extremes — ${maxLabel} (${fmtNum(max)}) and ${minLabel} (${fmtNum(min)}) — are the points to check`
}

/** Net direction word for the tracking directive. */
function netDirection(stats: MeasureStats): string {
  const range = stats.max - stats.min
  const delta = stats.last - stats.first
  if (range === 0 || Math.abs(delta) / range < 0.05) return "holds roughly steady"
  return delta > 0 ? "rises" : "falls"
}

/** Reception nudge appended to L4 when the audience finds this chart unfamiliar. */
function audienceNudge(component: string, audience: AudienceProfile | undefined): string {
  if (!audience) return ""
  const fam = audience.familiarity?.[component]
  if (typeof fam === "number" && fam <= 2) {
    return ` This ${kindPhrase(component)} may be unfamiliar${audience.name ? ` to ${audience.name.toLowerCase()} readers` : ""} — lean on this description.`
  }
  return ""
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

/** Pluralize a count noun for user-facing text ("1 edge", "2 edges"). */
function plural(n: number, noun: string): string {
  return n === 1 ? noun : `${noun}s`
}
