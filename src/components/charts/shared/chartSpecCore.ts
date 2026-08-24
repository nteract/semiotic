/**
 * Single source of truth for per-chart prop specifications consumed by:
 *   - `ai/schema.json`                                    (LLM tool definitions)
 *   - `src/components/charts/shared/validationMap.ts`     (runtime prop validation)
 *   - `ai/componentMetadata.cjs`                          (category buckets)
 *
 * `validationMap.generated.ts` and `ai/schema.json` are generated from
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

export type PropType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "function"
  | "null"
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
   *  through a registered entry in `serverChartConfigs.ts`. Live push-only
   *  charts declare false because no bounded static dataset was supplied. */
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
   * Additional JSON Schema keywords for this prop. Use this for nested wire
   * contracts (`items`, `properties`, `oneOf`, numeric bounds, and similar)
   * that cannot be expressed by the shallow runtime validation map. These
   * keywords are copied only to the AI/MCP schema; runtime validation still
   * consumes the top-level `type` and `enum` above.
   */
  schema?: Readonly<Record<string, unknown>>
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

const legendLayoutSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    align: { type: "string", enum: ["start", "center", "end", "left", "right"] },
    swatchSize: { type: "number", minimum: 1 },
    labelGap: { type: "number", minimum: 0 },
    itemGap: { type: "number", minimum: 0 },
    rowHeight: { type: "number", minimum: 1 },
    maxWidth: { type: "number", minimum: 1 },
    edgeGutter: { type: "number", minimum: 0, default: 3 },
    sideGutter: { type: "number", minimum: 0 },
    axisGutter: { type: "number", minimum: 0 },
  },
} as const

const commonProps: Record<string, ChartPropSpec> = {
  mode: {
    type: "string",
    enum: ["primary", "context", "sparkline", "mobile"] as const,
    default: "primary",
    description: "Display mode controlling default size, decoration, margins, labels, and interaction.",
  },
  width: { type: "number", default: 600 },
  height: { type: "number", default: 400 },
  margin: { type: ["number", "object"], description: "Uniform numeric margin or an object margin. Numeric sides are minima when chart-owned chrome such as legends needs more room; \"auto\", null, and omitted sides start from chart-mode defaults." },
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
    type: ["boolean", "object"],
    default: true,
    description: "Expose the chart data through Semiotic's screen-reader data table. Object form `{ portalTarget: string }` relocates its interactive UI to the DOM element with that ID.",
    schema: {
      oneOf: [
        { type: "boolean" },
        {
          type: "object",
          additionalProperties: false,
          required: ["portalTarget"],
          properties: {
            portalTarget: {
              type: "string",
              description: "ID of a DOM element outside any consumer-owned role=img wrapper. React callers may also pass an Element or a callback through the typed API.",
            },
          },
        },
      ],
    },
  },
  enableHover: { type: "boolean", default: true },
  showLegend: { type: "boolean" },
  legendInteraction: {
    type: "string",
    enum: ["highlight", "isolate", "none"] as const,
    default: "none",
    description: "Legend interaction mode: highlight on hover, isolate on click, or none.",
  },
  legendPosition: {
    type: "string",
    enum: ["right", "left", "top", "bottom"] as const,
    default: "right",
    description: "Position the legend beside or above/below the plot.",
  },
  // Advanced legend content can contain React nodes or custom group objects;
  // validate it at runtime without asking schema-driven callers to construct it.
  legend: { type: ["array", "object"], omitFromSchema: true },
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
  // Object form also accepts `{ mode: "multi", content? }` for custom multi
  // renderers — `content` is a function and is React-only.
  tooltip: {
    type: ["boolean", "function", "object", "string"],
    description:
      'Tooltip: true/false, "multi", { mode: "multi", content? }, a custom function, or { fields, title } config. Multi mode shows every series at the hovered x; custom multi content receives allSeries/xValue.',
  },
  annotations: { type: "array" },
  autoPlaceAnnotations: {
    type: ["boolean", "object"],
    default: false,
    description: "Opt-in annotation placement pass. Chooses dx/dy for note-like annotations without manual offsets and avoids note/mark/edge overlaps where possible.",
  },
  responsiveRules: { type: "array", description: "Semantic responsive transforms applied before chart-mode defaults." },
  mobileSemantics: { type: "object", description: "Phone/mobile contract consumed by audits, recipes, adapters, and agents." },
  mobileInteraction: { type: ["boolean", "object"], description: "Touch-first interaction policy for phone-sized chart slots." },
  maxDevicePixelRatio: { type: "number", description: "Maximum canvas backing-store DPR. Defaults to 3 on desktop and 2 on coarse-pointer/small-screen devices; canvases repaint when browser zoom or display density changes." },
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
  hoverHighlight: { type: ["boolean", "string"], description: "Dim non-hovered series/categories (true or the series-level mode; requires colorBy)." },
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
  frameProps: {
    type: "object",
    description: "Advanced Stream Frame overrides. `legendLayout` is structured below; other frame props remain pass-through values.",
    schema: {
      additionalProperties: true,
      properties: {
        legendLayout: legendLayoutSchema,
      },
    },
  },
  // `onClick` is a function-only handler; LLMs can't populate it.
  onClick: { type: "function", omitFromSchema: true },
}

const xyAxisProps: Record<string, ChartPropSpec> = {
  xLabel: { type: "string" },
  yLabel: { type: "string" },
  xFormat: { type: "function", omitFromSchema: true },
  yFormat: { type: "function", omitFromSchema: true },
  xScaleType: { type: "string", enum: ["linear", "log", "time"], description: "x scale type. \"time\" builds a scaleTime (required for landmark ticks on timestamps)." },
  yScaleType: {
    type: "string",
    enum: ["linear", "log", "symlog"],
    description: 'y scale type. "symlog" supports signed values while compressing large magnitudes.',
  },
}

const ordinalAxisProps: Record<string, ChartPropSpec> = {
  categoryLabel: { type: "string" },
  valueLabel: { type: "string" },
  showCategoryTicks: { type: "boolean", description: "Show category labels on the ordinal axis." },
  // Formatter callbacks remain valid React props, but JSON/MCP callers
  // cannot serialize executable functions. Keep them in runtime validation
  // while omitting them from the generated tool schema.
  valueFormat: { type: "function", omitFromSchema: true },
  categoryFormat: { type: "function", omitFromSchema: true },
  dataIdAccessor: { type: ["string", "function"], description: "Stable datum id used by push-mode remove() and update()." },
}

// Realtime charts share a different prop surface than static charts:
// `size` is the canonical sizing prop (with `width`/`height` aliases),
// they use chart-specific color encodings rather than the common
// `colorBy`/`colorScheme` pair, but share the same accessibility and legend
// metadata as the static chart wrappers,
// and they add streaming-window controls (`windowSize`, `windowMode`,
// `arrowOfTime`) plus the encoding configs (`decay`, `pulse`, `staleness`).
// Push-only — `dataShape: "realtime"` and `required: []` (data arrives via
// the ref API, not props).
const realtimeProps: Record<string, ChartPropSpec> = {
  data: { type: "array", description: "Optional initial/controlled streaming window; omit for ref-driven push mode." },
  mode: {
    type: "string",
    enum: ["primary", "context", "sparkline", "mobile"] as const,
    default: "primary",
    description: "Display mode controlling dimensions, chrome, and interaction defaults.",
  },
  size: { type: "array", description: "[width, height] in pixels" },
  width: { type: "number", description: "Alias for size[0]" },
  height: { type: "number", description: "Alias for size[1]" },
  maxDevicePixelRatio: { type: "number", description: "Maximum canvas backing-store DPR; canvases repaint when browser zoom or display density changes." },
  margin: { type: ["number", "object"] },
  className: { type: "string" },
  title: { type: "string", description: "Visible title and accessible chart name." },
  description: { type: "string", description: "Concise accessible chart description." },
  summary: { type: "string", description: "Screen-reader-only takeaway or interaction guidance." },
  accessibleTable: {
    type: ["boolean", "object"],
    default: true,
    description: "Expose the current streaming window as an accessible data table. Object form `{ portalTarget: string }` relocates its interactive UI to the DOM element with that ID.",
    schema: {
      oneOf: [
        { type: "boolean" },
        {
          type: "object",
          additionalProperties: false,
          required: ["portalTarget"],
          properties: { portalTarget: { type: "string" } },
        },
      ],
    },
  },
  showLegend: { type: "boolean" },
  legendPosition: { type: "string", enum: ["right", "left", "top", "bottom"] as const, default: "right" },
  legendInteraction: { type: "string", enum: ["highlight", "isolate", "none"] as const, default: "none" },
  timeAccessor: { type: ["string", "function"], description: "Key for time/x values" },
  valueAccessor: { type: ["string", "function"], description: "Key for y values" },
  windowSize: { type: "number", description: "Number of data points visible" },
  windowMode: { type: "string", enum: ["sliding", "growing"] as const },
  arrowOfTime: { type: "string", enum: ["left", "right"] as const },
  timeExtent: { type: "array" },
  valueExtent: { type: "array" },
  extentPadding: { type: "number" },
  showAxes: { type: "boolean" },
  background: { type: "string" },
  cursor: {
    type: "string",
    description:
      "Presentation-only CSS cursor for retained marks; does not add click, keyboard, or observation behavior."
  },
  enableHover: { type: ["boolean", "object"] },
  tooltip: { type: ["boolean", "string", "function", "object"], description: "Tooltip boolean, multi-series mode, content function, or config." },
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
  linkedHover: { type: ["boolean", "string", "object"] },
  selection: { type: "object" },
  loading: { type: "boolean" },
  loadingContent: { type: ["boolean", "object"], omitFromSchema: true },
  emptyContent: { type: ["boolean", "object"], omitFromSchema: true },
  chartId: { type: "string" },
  emphasis: { type: "string", enum: ["primary", "secondary"] as const },
  pointIdAccessor: { type: ["string", "function"], omitFromSchema: true },
  onObservation: { type: "function", omitFromSchema: true },
}

const realtimeStaticProps: Record<string, ChartPropSpec> = Object.fromEntries(
  Object.entries(realtimeProps).filter(
    ([propName]) => propName !== "windowSize" && propName !== "windowMode",
  ),
)

const physicsProps: Record<string, ChartPropSpec> = {
  data: { type: "array", description: "Array of source records. Each record becomes one or more simulated bodies." },
  mode: {
    type: "string",
    enum: ["primary", "context", "sparkline", "mobile"] as const,
    default: "primary",
    description: "Display mode controlling dimensions, chrome, and interaction defaults.",
  },
  size: { type: "array", description: "[width, height] in pixels" },
  width: { type: "number", description: "Alias for size[0]" },
  height: { type: "number", description: "Alias for size[1]" },
  maxDevicePixelRatio: { type: "number", description: "Maximum canvas backing-store DPR; canvases repaint when browser zoom or display density changes." },
  className: { type: "string" },
  title: { type: "string" },
  description: {
    type: "string",
    description: "Concise accessible description that overrides the generated aria-label.",
  },
  summary: {
    type: "string",
    description: "Screen-reader-only takeaway and interaction guidance.",
  },
  accessibleTable: {
    type: ["boolean", "object"],
    description: "Expose source data through Semiotic's screen-reader data table. Object form `{ portalTarget: string }` relocates its interactive UI to the DOM element with that ID.",
    schema: {
      oneOf: [
        { type: "boolean" },
        {
          type: "object",
          additionalProperties: false,
          required: ["portalTarget"],
          properties: { portalTarget: { type: "string" } },
        },
      ],
    },
  },
  chartId: { type: "string", description: "Stable chart identity for linked observation and navigation." },
  emphasis: { type: "string", enum: ["primary", "secondary"] as const },
  responsiveWidth: { type: "boolean" },
  responsiveHeight: { type: "boolean" },
  responsiveRules: { type: "array", description: "Semantic responsive transforms applied before chart-mode defaults." },
  mobileSemantics: { type: "object", description: "Phone/mobile visualization contract." },
  mobileInteraction: { type: ["boolean", "object"], description: "Touch-first interaction policy." },
  colorBy: { type: ["string", "function"], description: "Categorical field or accessor used to color simulated bodies." },
  color: { type: "string" },
  stroke: { type: "string" },
  strokeWidth: { type: "number" },
  opacity: { type: "number" },
  seed: { type: "number", default: 1, description: "Deterministic simulation seed." },
  ballRadius: { type: "number", description: "Radius of each simulated circular body in pixels." },
  hoverRadius: { type: "number", description: "Pixel hit radius for body hover tooltips." },
  paused: { type: "boolean", description: "Pause the simulation at mount or on prop update." },
  tooltip: { type: ["boolean", "string", "function", "object"], description: "Tooltip content function/config, multi mode, true for the default body tooltip, or false to disable hover tooltips." },
  annotations: { type: "array" },
  autoPlaceAnnotations: { type: ["boolean", "object"] },
  background: { type: "string" },
  legend: { type: ["array", "object"], omitFromSchema: true },
  legendPosition: { type: "string", enum: ["right", "left", "top", "bottom"] as const },
  legendLayout: { type: "object" },
  selection: { type: "object" },
  linkedHover: { type: ["boolean", "string", "object"] },
  onSimulationStateChange: {
    type: "function",
    omitFromSchema: true,
    description:
      "Observe running/settled pipeline state changes without reaching into frameProps.config."
  },
  loading: { type: "boolean" },
  loadingContent: { type: ["boolean", "object"], omitFromSchema: true },
  emptyContent: { type: ["boolean", "object"], omitFromSchema: true },
  frameProps: { type: "object", omitFromSchema: true },
}

export const PROP_BAGS = {
  common: commonProps,
  xyAxis: xyAxisProps,
  ordinalAxis: ordinalAxisProps,
  realtime: realtimeProps,
  realtimeStatic: realtimeStaticProps,
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
export const CHART_MODE_ENUM = ["primary", "context", "sparkline", "mobile"] as const

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
