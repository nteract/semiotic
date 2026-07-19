/**
 * Single source of truth for per-chart prop specifications.
 *
 * Three downstream consumers used to maintain their own per-chart entries:
 *   - `ai/schema.json`                                    (LLM tool definitions)
 *   - `src/components/charts/shared/validationMap.ts`     (runtime prop validation)
 *   - `ai/componentMetadata.cjs`                          (category buckets)
 *
 * Today, `validationMap.generated.ts` and `ai/schema.json` are generated from
 * this registry — run `npm run docs:chart-specs:schema` to refresh both after
 * editing a spec. `componentMetadata.cjs` is still
 * hand-edited but gated for parity by the registry: `check:chart-specs` (run
 * via `npm run check:chart-specs`) regenerates each chart's schema/
 * validation/metadata entries with the pure functions in
 * `scripts/lib/chart-specs-generators.mjs` and fails the build on any
 * drift, including unexpected adds or removes that bypass the registry.
 *
 * Design notes:
 *   - Shared prop bags (common, xyAxis, ordinalAxis) live in `PROP_BAGS` and
 *     are referenced by name in each spec so common surface stays in one place.
 *   - The runtime PropType set ("string" | "number" | "boolean" | "array" |
 *     "object" | "function") is broader than JSON Schema's, but the schema
 *     generator emits whatever types this registry declares — including
 *     "function" inside type unions (canonical entries like
 *     `RidgelinePlot.tooltip: ["function", "object"]` and
 *     `SwimlaneChart.onBrush: "function"` already use this convention; LLMs
 *     read the union and pick a non-function alternative when they can't
 *     supply a function value). For props that are purely callbacks or
 *     escape hatches an LLM cannot meaningfully populate, tag the spec
 *     with `omitFromSchema: true` to keep it in validationMap but out of
 *     schema.json. `description` and `default` annotations surface in
 *     schema.json (and MCP responses) but are dropped from validationMap
 *     (which only reads `type` and `enum`).
 */

export type PropType = "string" | "number" | "boolean" | "array" | "object" | "function"
export type DataShape = "array" | "object" | "network" | "realtime" | "none"
export type ChartCategory = "xy" | "ordinal" | "network" | "geo" | "realtime" | "physics" | "value"

/**
 * Capability tags for runtime behavior. Each chart declares which
 * features it actually supports so docs, AI/MCP tools, and CI gates
 * can read structured truth instead of inferring it from the source.
 *
 * All fields are required so a new chart entry can't omit them
 * silently — the audit's anti-goal "Do not make registry metadata
 * aspirational. It should describe real runtime behavior and be
 * checked." applies here.
 */
export interface ChartCapabilities {
  /**
   * Render pipeline. `canvas` for Stream-Frame-driven charts that
   * paint to canvas with SVG overlays for chrome (the common case).
   * `svg` for charts that are pure SVG (none today, but reserved).
   * `hybrid` for charts that use both — currently every Stream-Frame
   * HOC qualifies as hybrid; reserve `canvas` for any future
   * canvas-only fallback.
   */
  renderModes: Array<"canvas" | "svg" | "hybrid">

  /** Renders a legend swatch column when `colorBy` (or equivalent)
   *  resolves to non-empty categories. */
  supportsLegend: boolean
  /** Reads from a `selection` prop and dims/highlights matching
   *  marks via `wrapStyleWithSelection` or equivalent. */
  supportsSelection: boolean
  /** Produces a hover-driven selection (used by linked crosshair /
   *  cross-filter patterns) via `linkedHover`. */
  supportsLinkedHover: boolean
  /** Exposes a ref handle (`push`, `pushMany`, etc.) so consumers
   *  can mutate the data list without re-rendering. Hierarchy
   *  charts (Treemap/CirclePack/TreeDiagram/OrbitDiagram) and
   *  pure-synthetic charts (GaugeChart) declare false. */
  supportsPush: boolean
  /** Renders to a static SVG via `renderChart()` from `semiotic/server`
   *  through a registered entry in `serverChartConfigs.ts`. SSR-only
   *  charts (none yet) and HOC-SSR exclusions also declare false. */
  supportsSSR: boolean

  /**
   * How color is consumed by the chart's data marks.
   * - `categorical`: discrete buckets, paired with a `colorBy` accessor.
   * - `sequential`: continuous scale (heatmap intensity, choropleth value).
   * - `threshold`: stepped scale with explicit breakpoints (gauge zones).
   * - `continuous`: smooth interpolation along a 1-D path (gradient fill).
   * - `none`: chart doesn't use color encoding (sparkline, pure layout).
   */
  colorModel: "categorical" | "sequential" | "threshold" | "continuous" | "none"

  /**
   * Where the geometry comes from.
   * - `plugin`: a built-in plugin in the frame (sankey/force/chord/tree
   *   for network; bar/pie/swarm/etc. for ordinal; line/area/etc. for XY).
   * - `custom`: emitted via the frame's customLayout escape hatch
   *   (ProcessSankey via `customNetworkLayout`, NetworkCustomChart,
   *   XYCustomChart, OrdinalCustomChart).
   * - `synthetic`: no layout — the chart constructs its scene from
   *   the input value(s) directly (GaugeChart computes arc geometry).
   */
  layoutMode: "plugin" | "custom" | "synthetic"

  /**
   * Free-form tag list for opt-in features that don't fit the
   * boolean shape — e.g. "particles", "forecast", "anomaly", "brush",
   * "streamgraph", "minimap". Used by docs feature tables and
   * potential capability-driven AI suggestions.
   */
  specialFeatures: string[]
}

export interface ChartPropSpec {
  /** Allowed runtime types. May be a single value or a union. */
  type: PropType | PropType[]
  /** Allowed enum values for string-typed props. */
  enum?: readonly string[]
  /** Default value surfaced in schema.json (and shown in MCP getSchema). */
  default?: unknown
  /** Schema-side description; surfaces in LLM tool definitions. */
  description?: string
  /**
   * When true, the prop is included in validationMap but omitted from
   * schema.json. Use for handler/callback props (`onClick`, `tooltip`)
   * and pass-through escape hatches (`frameProps`) that LLMs shouldn't
   * be asked to populate.
   */
  omitFromSchema?: boolean
}

export interface ChartSpec {
  /** Component name, must match the React export. */
  name: string
  category: ChartCategory
  /** Human-readable description for schema.tools[].function.description. */
  description: string
  /** Statically-required props. Push-mode optionality lives in behaviorContracts. */
  required: string[]
  /** Drives validation dispatch (validateArrayData / validateNetworkData / …). */
  dataShape: DataShape
  /** Accessor props validated against the data shape at runtime. */
  dataAccessors: string[]
  /**
   * Shared prop bags this chart composes. Bag props are merged in left-to-right
   * order; chart-specific `ownProps` win on key collision.
   */
  propBags: ReadonlyArray<keyof typeof PROP_BAGS>
  /** Chart-specific prop spec, overlaid on top of the composed bags. */
  ownProps: Record<string, ChartPropSpec>
  /**
   * Capability matrix — declarative facts about runtime behavior.
   * Drives docs feature tables, capability-aware AI/MCP tools, and
   * the `check:capabilities` drift gate (which verifies, e.g., that
   * a chart claiming `supportsSSR: true` has a matching entry in
   * `serverChartConfigs.ts`).
   */
  capabilities: ChartCapabilities
}

// ---------------------------------------------------------------------------
// Shared prop bags
// ---------------------------------------------------------------------------

const commonProps: Record<string, ChartPropSpec> = {
  width: { type: "number", default: 600 },
  height: { type: "number", default: 400 },
  margin: { type: "object", description: "Object margin. A side value of \"auto\" or null leaves that side available for auto-reservation." },
  className: { type: "string" },
  title: {
    type: "string",
    description: "Visible chart title and the chart's accessible name.",
  },
  description: {
    type: "string",
    description: "Concise accessible description that overrides the chart's generated aria-label.",
  },
  summary: {
    type: "string",
    description: "Screen-reader-only summary of the chart's key takeaway; include keyboard interaction guidance when relevant.",
  },
  accessibleTable: {
    type: "boolean",
    default: true,
    description: "Expose the chart data through Semiotic's screen-reader data table.",
  },
  enableHover: { type: "boolean", default: true },
  showLegend: { type: "boolean" },
  showGrid: { type: "boolean", default: false },
  colorBy: { type: ["string", "function"] },
  // Object maps are first-class at runtime (createColorScale); accept them
  // in validation so agent/object-map configs don't fail doctor.
  colorScheme: { type: ["string", "array", "object"], default: "category10" },
  // Tooltip surfaces in schema as a type union including "function" —
  // canonical schema entries for `tooltip` already use this shape (e.g.
  // `RidgelinePlot.tooltip: ["function", "object"]`). LLMs that can't
  // supply functions choose the boolean/object variant.
  // String form includes "multi" for charts that wire tooltipMode (Line/Area/…).
  tooltip: { type: ["boolean", "function", "object", "string"] },
  annotations: { type: "array" },
  autoPlaceAnnotations: {
    type: ["boolean", "object"],
    default: false,
    description: "Opt-in annotation placement pass. Chooses dx/dy for note-like annotations without manual offsets and avoids note/mark/edge overlaps where possible.",
  },
  responsiveRules: { type: "array", description: "Semantic responsive transforms applied before chart-mode defaults." },
  mobileSemantics: { type: "object", description: "Phone/mobile contract consumed by audits, recipes, adapters, and agents." },
  mobileInteraction: { type: ["boolean", "object"], description: "Touch-first interaction policy for phone-sized chart slots." },
  axisExtent: {
    type: "string",
    enum: ["nice", "exact"] as const,
    default: "nice",
    description: 'Tick endpoint mode. "nice" rounds endpoints to readable values; "exact" pins the first and last tick to the actual data min and max with equidistant intermediates. Affects XY x/y axes and ordinal value axis only.',
  },
  animate: {
    type: ["boolean", "object"],
    description: "Enable mark transitions (boolean or {duration?, easing?, intro?}).",
  },
  loading: { type: "boolean", description: "Show loading skeleton / loadingContent." },
  loadingContent: { type: ["boolean", "object"], omitFromSchema: true, description: "ReactNode override for loading state; false suppresses." },
  emptyContent: { type: ["boolean", "object"], omitFromSchema: true, description: "ReactNode when data is empty; false suppresses." },
  hoverHighlight: { type: "boolean", description: "Dim non-hovered series/categories (requires colorBy string field)." },
  chartId: { type: "string", description: "Stable id for linked selection / observation / nav sync." },
  emphasis: { type: "string", enum: ["primary", "secondary"] as const },
  responsiveWidth: { type: "boolean" },
  responsiveHeight: { type: "boolean" },
  color: { type: "string", description: "Uniform mark fill (primitive styling)." },
  stroke: { type: "string" },
  strokeWidth: { type: "number" },
  opacity: { type: "number" },
  // `onObservation` is function-only; LLMs can't populate it.
  onObservation: { type: "function", omitFromSchema: true },
  // `frameProps` is a typed pass-through for advanced StreamFrame
  // overrides — too unstructured to be useful in LLM tool definitions.
  frameProps: { type: "object", omitFromSchema: true },
  // `onClick` is a function-only handler; LLMs can't populate it.
  onClick: { type: "function", omitFromSchema: true },
}

const xyAxisProps: Record<string, ChartPropSpec> = {
  xLabel: { type: "string" },
  yLabel: { type: "string" },
  xFormat: { type: "function", omitFromSchema: true },
  yFormat: { type: "function", omitFromSchema: true },
  xScaleType: { type: "string", enum: ["linear", "log", "time"], description: "x scale type. \"time\" builds a scaleTime (required for landmark ticks on timestamps)." },
  yScaleType: { type: "string", enum: ["linear", "log", "time"], description: "y scale type." },
}

const ordinalAxisProps: Record<string, ChartPropSpec> = {
  categoryLabel: { type: "string" },
  valueLabel: { type: "string" },
  // `valueFormat` surfaces in schema as a function type — canonical
  // GaugeChart already uses this shape. LLMs use it as a hint that
  // numeric formatting is overridable; they can't populate it directly.
  valueFormat: { type: "function" },
  categoryFormat: { type: "function", omitFromSchema: true },
}

// Realtime charts share a different prop surface than static charts:
// `size` is the canonical sizing prop (with `width`/`height` aliases),
// they don't expose `colorBy`/`colorScheme`/`title`/`showLegend`/`showGrid`,
// and they add streaming-window controls (`windowSize`, `windowMode`,
// `arrowOfTime`) plus the encoding configs (`decay`, `pulse`, `staleness`).
// Push-only — `dataShape: "realtime"` and `required: []` (data arrives via
// the ref API, not props).
const realtimeProps: Record<string, ChartPropSpec> = {
  size: { type: "array", description: "[width, height] in pixels" },
  width: { type: "number", description: "Alias for size[0]" },
  height: { type: "number", description: "Alias for size[1]" },
  margin: { type: "object" },
  className: { type: "string" },
  timeAccessor: { type: ["string", "function"], description: "Key for time/x values" },
  valueAccessor: { type: ["string", "function"], description: "Key for y values" },
  windowSize: { type: "number", description: "Number of data points visible" },
  windowMode: { type: "string", enum: ["sliding", "stepping"] as const },
  arrowOfTime: { type: "string", enum: ["left", "right"] as const },
  timeExtent: { type: "array" },
  valueExtent: { type: "array" },
  extentPadding: { type: "number" },
  showAxes: { type: "boolean" },
  background: { type: "string" },
  enableHover: { type: ["boolean", "object"] },
  tooltip: { type: ["function", "object"], description: "Tooltip content function or config" },
  // `tooltipContent` and `onHover` are function-only callbacks — runtime-only.
  tooltipContent: { type: "function", omitFromSchema: true },
  onHover: { type: "function", omitFromSchema: true },
  annotations: { type: "array" },
  autoPlaceAnnotations: { type: ["boolean", "object"], description: "Opt-in annotation placement pass for note-like annotations without manual offsets." },
  responsiveRules: { type: "array", description: "Semantic responsive transforms applied before chart-mode defaults." },
  mobileSemantics: { type: "object", description: "Phone/mobile contract consumed by audits, recipes, adapters, and agents." },
  mobileInteraction: { type: ["boolean", "object"], description: "Touch-first interaction policy for phone-sized chart slots." },
  svgAnnotationRules: { type: "function", omitFromSchema: true },
  tickFormatTime: { type: "function", omitFromSchema: true },
  tickFormatValue: { type: "function", omitFromSchema: true },
  decay: { type: "object", description: "Decay config: { type, halfLife, minOpacity }" },
  pulse: { type: "object", description: "Pulse config: { duration, color, glowRadius }" },
  staleness: { type: "object", description: "Staleness config: { threshold, dimOpacity, showBadge }" },
}

const physicsProps: Record<string, ChartPropSpec> = {
  data: { type: "array", description: "Array of source records. Each record becomes one or more simulated bodies." },
  size: { type: "array", description: "[width, height] in pixels" },
  width: { type: "number", description: "Alias for size[0]" },
  height: { type: "number", description: "Alias for size[1]" },
  className: { type: "string" },
  title: { type: "string" },
  responsiveWidth: { type: "boolean" },
  responsiveHeight: { type: "boolean" },
  colorBy: { type: ["string", "function"], description: "Categorical field or accessor used to color simulated bodies." },
  seed: { type: "number", default: 1, description: "Deterministic simulation seed." },
  ballRadius: { type: "number", description: "Radius of each simulated circular body in pixels." },
  hoverRadius: { type: "number", description: "Pixel hit radius for body hover tooltips." },
  paused: { type: "boolean", description: "Pause the simulation at mount or on prop update." },
  tooltip: { type: ["boolean", "function", "object"], description: "Tooltip content function/config, true for the default body tooltip, or false to disable hover tooltips." },
  frameProps: { type: "object", omitFromSchema: true },
}

export const PROP_BAGS = {
  common: commonProps,
  xyAxis: xyAxisProps,
  ordinalAxis: ordinalAxisProps,
  realtime: realtimeProps,
  physics: physicsProps,
} as const

// ---------------------------------------------------------------------------
// Reusable enums
// ---------------------------------------------------------------------------

export const ORIENTATION_ENUM = ["vertical", "horizontal"] as const
export const HORIZONTAL_VERTICAL_ENUM = ["horizontal", "vertical"] as const
export const LEGEND_POSITION_ENUM = ["right", "left", "top", "bottom"] as const
export const CURVE_ENUM = [
  "linear", "monotoneX", "monotoneY", "step",
  "stepAfter", "stepBefore", "basis", "cardinal", "catmullRom",
] as const
export const CHART_MODE_ENUM = ["primary", "context", "sparkline"] as const

// ---------------------------------------------------------------------------
// Chart specs (XY, ordinal, network, geo, and realtime families)
// ---------------------------------------------------------------------------
//
// Drift annotations (`omitFromSchema: true`) tag props that are runtime-only
// — callbacks, escape hatches, comparator functions an LLM can't supply.
// They appear in validationMap (so the runtime accepts them) but are
// dropped from `ai/schema.json` (so tool-calling models don't try to fill
// them). Drop the annotation if a prop becomes meaningfully callable from
// a structured config.


// ---------------------------------------------------------------------------
// Helpers (used by generators)
// ---------------------------------------------------------------------------

/**
 * Compose a chart's full prop set (bags + ownProps) in deterministic order.
 * ownProps wins on key collision so a chart can override a shared default.
 */
export function composeProps(spec: ChartSpec): Record<string, ChartPropSpec> {
  const result: Record<string, ChartPropSpec> = {}
  for (const bagName of spec.propBags) {
    Object.assign(result, PROP_BAGS[bagName])
  }
  Object.assign(result, spec.ownProps)
  return result
}
