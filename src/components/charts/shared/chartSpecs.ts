/**
 * Single source of truth for per-chart prop specifications.
 *
 * Three downstream consumers used to maintain their own per-chart entries:
 *   - `ai/schema.json`                                    (LLM tool definitions)
 *   - `src/components/charts/shared/validationMap.ts`     (runtime prop validation)
 *   - `ai/componentMetadata.cjs`                          (category buckets)
 *
 * Today, `ai/schema.json` is generated from this registry — run
 * `npm run docs:chart-specs:schema` to refresh it after editing a spec.
 * `validationMap.ts` and `ai/componentMetadata.cjs` are still hand-edited
 * but are gated for parity by the registry: `check:chart-specs` (run via
 * `npm run check:chart-specs`) regenerates each chart's schema/
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
export type ChartCategory = "xy" | "ordinal" | "network" | "geo" | "realtime"

/**
 * Capability tags for runtime behavior. Driven by the
 * `hoc-frame-architecture-audit` Phase 1: each chart declares which
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
  margin: { type: "object" },
  className: { type: "string" },
  title: { type: "string" },
  enableHover: { type: "boolean", default: true },
  showLegend: { type: "boolean" },
  showGrid: { type: "boolean", default: false },
  colorBy: { type: ["string", "function"] },
  colorScheme: { type: ["string", "array"], default: "category10" },
  // Tooltip surfaces in schema as a type union including "function" —
  // canonical schema entries for `tooltip` already use this shape (e.g.
  // `RidgelinePlot.tooltip: ["function", "object"]`). LLMs that can't
  // supply functions choose the boolean/object variant.
  tooltip: { type: ["boolean", "function", "object"] },
  annotations: { type: "array" },
  axisExtent: {
    type: "string",
    enum: ["nice", "exact"] as const,
    default: "nice",
    description: 'Tick endpoint mode. "nice" rounds endpoints to readable values; "exact" pins the first and last tick to the actual data min and max with equidistant intermediates. Affects XY x/y axes and ordinal value axis only.',
  },
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
  svgAnnotationRules: { type: "function", omitFromSchema: true },
  tickFormatTime: { type: "function", omitFromSchema: true },
  tickFormatValue: { type: "function", omitFromSchema: true },
  decay: { type: "object", description: "Decay config: { type, halfLife, minOpacity }" },
  pulse: { type: "object", description: "Pulse config: { duration, color, glowRadius }" },
  staleness: { type: "object", description: "Staleness config: { threshold, dimOpacity, showBadge }" },
}

export const PROP_BAGS = {
  common: commonProps,
  xyAxis: xyAxisProps,
  ordinalAxis: ordinalAxisProps,
  realtime: realtimeProps,
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

export const CHART_SPECS: Record<string, ChartSpec> = {
  BarChart: {
    name: "BarChart",
    category: "ordinal",
    description: "Vertical or horizontal bars for categorical comparisons.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      categoryAccessor: { type: ["string", "function"], default: "category", description: "Key for category labels" },
      valueAccessor: { type: ["string", "function"], default: "value", description: "Key for bar values" },
      orientation: { type: "string", enum: ORIENTATION_ENUM, default: "vertical" },
      sort: { type: ["boolean", "string", "function"], default: false, description: "Sort bars: false, true, 'asc', 'desc', or comparator function" },
      barPadding: { type: "number", default: 40 },
      // `roundedTop` is in validationMap but absent from schema.json —
      // hand-curation oversight. Phase 3 can re-baseline schema with it
      // exposed; for now match the canonical surface.
      roundedTop: { type: "number", omitFromSchema: true },
      regression: {
        type: ["boolean", "string", "object"],
        description: "Overlay a regression line through the bar tops. Accepts true (linear), a method ('linear' | 'polynomial' | 'loess'), or a full RegressionConfig. Pixels resolve through the band scale.",
      },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["regression-overlay"],
    },
  },

  StackedBarChart: {
    name: "StackedBarChart",
    category: "ordinal",
    description: "Stacked bars for part-to-whole comparisons across categories. Requires stackBy to define the stacking dimension.",
    required: ["data", "stackBy"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      stackBy: { type: ["string", "function"], description: "Key to define the stacking dimension (required)" },
      categoryAccessor: { type: ["string", "function"], default: "category" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      orientation: { type: "string", enum: ORIENTATION_ENUM, default: "vertical" },
      normalize: { type: "boolean", default: false, description: "Normalize stacks to 100%" },
      sort: { type: ["boolean", "string", "function"], omitFromSchema: true },
      barPadding: { type: "number", default: 40 },
      roundedTop: { type: "number", omitFromSchema: true },
      // Canonical schema flags `true` for stacked bars to surface the legend.
      showLegend: { type: "boolean", default: true },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["stack"],
    },
  },

  GroupedBarChart: {
    name: "GroupedBarChart",
    category: "ordinal",
    description: "Side-by-side bars for comparing sub-categories within categories. Requires groupBy to define grouping.",
    required: ["data", "groupBy"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      groupBy: { type: ["string", "function"], description: "Key to define the grouping dimension (required)" },
      categoryAccessor: { type: ["string", "function"], default: "category" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      orientation: { type: "string", enum: ORIENTATION_ENUM, default: "vertical" },
      sort: { type: ["boolean", "string", "function"], omitFromSchema: true },
      barPadding: { type: "number", default: 60 },
      roundedTop: { type: "number", omitFromSchema: true },
      // Canonical schema flags `true` for grouped bars to surface the legend.
      showLegend: { type: "boolean", default: true },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  SwarmPlot: {
    name: "SwarmPlot",
    category: "ordinal",
    description: "Beeswarm/jittered dot plot showing individual data points within categories. Good for distributions.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      categoryAccessor: { type: ["string", "function"], default: "category" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      orientation: { type: "string", enum: ORIENTATION_ENUM, default: "vertical" },
      sizeBy: { type: ["string", "function"], description: "Key for variable point sizing" },
      sizeRange: { type: "array", default: [3, 8] },
      pointRadius: { type: "number", default: 4 },
      pointOpacity: { type: "number", default: 0.7 },
      categoryPadding: { type: "number", default: 20 },
      // Brush props are runtime-only — schema.json hides them from LLMs.
      brush: { type: "boolean", omitFromSchema: true },
      onBrush: { type: "function", omitFromSchema: true },
      linkedBrush: { type: ["string", "object"], omitFromSchema: true },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  BoxPlot: {
    name: "BoxPlot",
    category: "ordinal",
    description: "Box-and-whisker plots showing statistical distribution (median, quartiles, outliers) per category.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      categoryAccessor: { type: ["string", "function"], default: "category" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      orientation: { type: "string", enum: ORIENTATION_ENUM, default: "vertical" },
      showOutliers: { type: "boolean", default: true, description: "Show outlier points" },
      outlierRadius: { type: "number", default: 3 },
      categoryPadding: { type: "number", default: 20 },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["statistical"],
    },
  },

  Histogram: {
    name: "Histogram",
    category: "ordinal",
    description: "Binned frequency distribution chart. Shows how data values are distributed across bins within categories.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      categoryAccessor: { type: ["string", "function"], default: "category" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      bins: { type: "number", default: 25, description: "Number of bins for the histogram" },
      relative: { type: "boolean", default: false, description: "Normalize counts per category to show relative frequency" },
      categoryPadding: { type: "number", default: 20 },
      brush: { type: "boolean", omitFromSchema: true },
      onBrush: { type: "function", omitFromSchema: true },
      linkedBrush: { type: ["string", "object"], omitFromSchema: true },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  ViolinPlot: {
    name: "ViolinPlot",
    category: "ordinal",
    description: "Violin plots showing the full distribution shape (kernel density) per category. Combines density estimation with optional IQR lines.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      categoryAccessor: { type: ["string", "function"], default: "category" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      orientation: { type: "string", enum: ORIENTATION_ENUM, default: "vertical" },
      bins: { type: "number", default: 25, description: "Number of bins for density estimation" },
      curve: { type: "string", default: "catmullRom", description: "Interpolation curve for the violin shape" },
      showIQR: { type: "boolean", default: true, description: "Show interquartile range lines" },
      categoryPadding: { type: "number", default: 20 },
      brush: { type: "boolean", omitFromSchema: true },
      onBrush: { type: "function", omitFromSchema: true },
      linkedBrush: { type: ["string", "object"], omitFromSchema: true },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["statistical"],
    },
  },

  RidgelinePlot: {
    name: "RidgelinePlot",
    category: "ordinal",
    description: "Overlapping density distributions for comparing distributions across categories. Each category gets a density curve that can overlap with adjacent rows.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      categoryAccessor: { type: ["string", "function"], description: "Key for category grouping" },
      valueAccessor: { type: ["string", "function"], description: "Key for numeric values to build distributions from" },
      bins: { type: "number", description: "Number of bins for density estimation" },
      amplitude: { type: "number", default: 1.5, description: "Unitless multiplier of row height (>1 creates overlap)" },
      categoryPadding: { type: "number", omitFromSchema: true },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  DotPlot: {
    name: "DotPlot",
    category: "ordinal",
    description: "Cleveland-style dot plot for comparing values across categories. Sorted by default.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      categoryAccessor: { type: ["string", "function"], default: "category" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      orientation: { type: "string", enum: ORIENTATION_ENUM, default: "horizontal" },
      sort: { type: ["boolean", "string", "function"], default: true, description: "Sort dots: true, false, 'asc', 'desc'" },
      dotRadius: { type: "number", default: 5 },
      categoryPadding: { type: "number", default: 10 },
      // Canonical schema flags showGrid `true` for DotPlot — grid lines help
      // readers eyeball values along the value axis.
      showGrid: { type: "boolean", default: true },
      regression: {
        type: ["boolean", "string", "object"],
        description: "Overlay a regression line through the dots. Same shape as Scatterplot's regression prop.",
      },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["regression-overlay"],
    },
  },

  PieChart: {
    name: "PieChart",
    category: "ordinal",
    description: "Proportional slices in a circle for part-to-whole relationships.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      categoryAccessor: { type: ["string", "function"], default: "category" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      // schema.json describes `startAngle` as radians but the runtime
      // converts via degrees → radians (`* Math.PI / 180`). The JSDoc on
      // PieChartProps was corrected; the schema description here intentionally
      // matches the canonical (pre-corrected) text to keep Phase 2 byte-stable.
      startAngle: { type: "number", default: 0, description: "Starting angle in radians" },
      cornerRadius: { type: "number", omitFromSchema: true },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  DonutChart: {
    name: "DonutChart",
    category: "ordinal",
    description: "Pie chart with a hole in the center. Supports center content like summary statistics.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      categoryAccessor: { type: ["string", "function"], default: "category" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      innerRadius: { type: "number", default: 60, description: "Inner radius of the donut hole in pixels" },
      centerContent: { type: ["object", "string", "number"], description: "React node to render in the center of the donut (accepts string key or JSX)" },
      startAngle: { type: "number", default: 0 },
      cornerRadius: { type: "number", omitFromSchema: true },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  GaugeChart: {
    name: "GaugeChart",
    category: "ordinal",
    description: "Single-value gauge with threshold zones, needle indicator, and configurable sweep angle. Built on StreamOrdinalFrame radial projection.",
    required: ["value"],
    dataShape: "none",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      value: { type: "number", description: "Current gauge value" },
      min: { type: "number", default: 0 },
      max: { type: "number", default: 100 },
      thresholds: { type: "array", description: "Array of { value, color, label? } defining threshold zones. Last value should equal max." },
      arcWidth: { type: "number", default: 0.3, description: "Arc thickness as fraction of radius (0-1)" },
      cornerRadius: { type: "number", description: "Pixel radius for rounded segment ends. Same semantics as DonutChart's cornerRadius. Omit for sharp corners." },
      sweep: { type: "number", default: 240, description: "Arc sweep angle in degrees (gap centered at bottom)" },
      showNeedle: { type: "boolean", default: true },
      needleColor: { type: "string" },
      // GaugeChart only uses the `common` bag (no ordinalAxis), so
      // `valueFormat` is an explicit ownProp. Both canonical schema and
      // validationMap expose it. `centerContent` accepts ReactNode which
      // can't be serialized into a tool definition; same for backgroundColor
      // — kept runtime-only.
      valueFormat: { type: "function" },
      centerContent: { type: ["object", "string", "number", "function"], omitFromSchema: true },
      showScaleLabels: { type: "boolean", default: true },
      backgroundColor: { type: "string", omitFromSchema: true },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: false, supportsSelection: false, supportsLinkedHover: false,
      // Single-scalar `value` prop — push API is fundamentally
      // array-append. Drive realtime via `value={state}` + setInterval
      // / external store updates, exactly the controlled-prop pattern
      // the docs streaming demo uses.
      supportsPush: false, supportsSSR: true,
      colorModel: "threshold", layoutMode: "synthetic",
      specialFeatures: ["threshold-zones", "value-only", "controlled-prop-streaming"],
    },
  },

  FunnelChart: {
    name: "FunnelChart",
    category: "ordinal",
    description: "Funnel visualization with two orientations. Horizontal (default): steps top-to-bottom with centered bars and trapezoid connectors; multi-category mirrors around center axis. Vertical: steps on x-axis as vertical bars with hatched dropoff stacking (solid = retained, hatched = dropoff from previous step); multi-category renders grouped bars.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["stepAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects with step and value fields" },
      stepAccessor: { type: ["string", "function"], default: "step", description: "Key for funnel step/stage name" },
      valueAccessor: { type: ["string", "function"], default: "value", description: "Key for numeric value per step" },
      categoryAccessor: { type: ["string", "function"], description: "Key to split each step into mirrored categories (optional)" },
      orientation: { type: "string", enum: HORIZONTAL_VERTICAL_ENUM, default: "horizontal", description: "Horizontal (default): centered bars top-to-bottom with trapezoid connectors. Vertical: vertical bars with hatched dropoff stacking — solid = retained, hatched = dropoff from previous step. Multi-category renders grouped bars in vertical mode." },
      connectorOpacity: { type: "number", default: 0.3, description: "Opacity of trapezoid connectors between steps (0-1). Horizontal orientation only." },
      showCategoryTicks: { type: "boolean", default: false, description: "Show category tick labels on ordinal axis" },
      responsiveWidth: { type: "boolean" },
      legendPosition: { type: "string", enum: LEGEND_POSITION_ENUM },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  SwimlaneChart: {
    name: "SwimlaneChart",
    category: "ordinal",
    description: "Categorical lanes with sequentially stacked items colored by subcategory. Unlike StackedBarChart, the same subcategory can appear multiple times in the same lane — items stack left-to-right (horizontal) or bottom-to-top (vertical) in data order. Supports brush for value-axis selection and push API for streaming.",
    required: ["subcategoryAccessor"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "subcategoryAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects. Omit for push API mode." },
      categoryAccessor: { type: ["string", "function"], default: "category", description: "Key for lane categories (swim lanes)" },
      subcategoryAccessor: { type: ["string", "function"], description: "Key for item subcategory (color grouping within lanes). Required. Duplicate subcategories in the same lane stack sequentially." },
      valueAccessor: { type: ["string", "function"], default: "value", description: "Key for item size/duration along the value axis" },
      orientation: { type: "string", enum: HORIZONTAL_VERTICAL_ENUM, default: "horizontal", description: "Horizontal renders lanes as rows; vertical as columns." },
      barPadding: { type: "number", default: 40, description: "Padding between lanes in pixels" },
      roundedTop: { type: "number", description: "Rounded corner radius (px) applied to the outermost ends of each lane — left+right for horizontal, top+bottom for vertical. Middle segments stay square; single-segment lanes round all four corners." },
      brush: { type: "boolean", description: "Enable value-axis brush selection" },
      onBrush: { type: "function", description: "Callback with { r: [min, max] } or null when brush clears" },
      linkedBrush: { type: ["string", "object"], description: "LinkedCharts brush integration name" },
      showCategoryTicks: { type: "boolean", description: "Show lane labels on the category axis" },
      responsiveWidth: { type: "boolean" },
      legendPosition: { type: "string", enum: LEGEND_POSITION_ENUM },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["brush"],
    },
  },

  LikertChart: {
    name: "LikertChart",
    category: "ordinal",
    description: "Visualize Likert scale survey responses. Horizontal (default): diverging bar chart centered at 0% — negative levels extend left, positive right, neutral (if odd count) split 50/50 across centerline. Vertical: stacked 100% bar chart. Supports raw integer scores (1-based, aggregated automatically) or pre-aggregated (question, level, count) data. The levels array defines polarity: first half = negative, second half = positive, center = neutral (if odd). Works with any scale size (3-point to 7-point+). Supports push API for streaming — accumulates raw data and re-aggregates on each push.",
    required: ["levels"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor", "levelAccessor", "countAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of raw response or pre-aggregated data objects" },
      levels: { type: "array", description: "Ordered response labels, most negative to most positive (required). Odd count = center is neutral." },
      categoryAccessor: { type: ["string", "function"], default: "question", description: "Question/item field (ordinal axis)" },
      valueAccessor: { type: ["string", "function"], default: "score", description: "Integer score field for raw response mode (1-based: score 1 → levels[0])" },
      levelAccessor: { type: ["string", "function"], description: "Level name field for pre-aggregated mode. Each value must match an entry in levels." },
      countAccessor: { type: ["string", "function"], default: "count", description: "Count/frequency field for pre-aggregated mode" },
      // LikertChart's runtime validationMap uses ORIENTATION_ENUM order
      // (vertical/horizontal) while its canonical schema entry uses
      // (horizontal/vertical). The schema test reads canonical schema and
      // matches; the validationMap test reads canonical validationMap and
      // matches. Use ORIENTATION_ENUM here so the validationMap round-trip
      // passes; the schema test relies on schema's value being identical.
      orientation: { type: "string", enum: ORIENTATION_ENUM, default: "horizontal" },
      barPadding: { type: "number", default: 20 },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  // ─── XY family ────────────────────────────────────────────────────────

  LineChart: {
    name: "LineChart",
    category: "xy",
    description: "Line traces with curve interpolation, area fill, and point markers. Use for time series, trends, and continuous data.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      xAccessor: { type: ["string", "function"], default: "x", description: "Key or accessor function for x-axis values" },
      yAccessor: { type: ["string", "function"], default: "y", description: "Key or accessor function for y-axis values" },
      lineBy: { type: ["string", "function"], description: "Key to group data into separate lines" },
      lineDataAccessor: { type: "string", default: "coordinates", description: "Key for the coordinates array within each line object" },
      curve: { type: "string", enum: CURVE_ENUM, default: "linear", description: "Curve interpolation method" },
      lineWidth: { type: "number", default: 2, description: "Stroke width of the line" },
      showPoints: { type: "boolean", default: false, description: "Show data point markers on the line" },
      pointRadius: { type: "number", default: 3, description: "Radius of point markers when showPoints is true" },
      fillArea: { type: "boolean", default: false, description: "Fill the area under the line" },
      areaOpacity: { type: "number", default: 0.3, description: "Opacity of the filled area (0-1)" },
      forecast: { type: "object", description: "Forecast overlay config — tagged training/observed/forecast region with optional envelope. See ForecastConfig." },
      anomaly: { type: "object", description: "Anomaly overlay config — ±σ band + anomaly dot annotations. See AnomalyConfig." },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      // `series-features` umbrella tag = uses the shared
      // `useSeriesFeatures` hook; the specific `forecast` / `anomaly`
      // tags describe individual capabilities for AI discovery.
      specialFeatures: ["forecast", "anomaly", "series-features", "gap-handling", "direct-labels", "endpoint-labels"],
    },
  },

  AreaChart: {
    name: "AreaChart",
    category: "xy",
    description: "Filled area chart with optional stroke line. Use for showing volume or magnitude over time.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      xAccessor: { type: ["string", "function"], default: "x", description: "Key for x-axis values" },
      yAccessor: { type: ["string", "function"], default: "y", description: "Key for y-axis values" },
      areaBy: { type: ["string", "function"], description: "Key to group data into separate areas" },
      lineDataAccessor: { type: "string", default: "coordinates", description: "Key for the coordinates array within each area object" },
      curve: { type: "string", enum: CURVE_ENUM, default: "monotoneX" },
      areaOpacity: { type: "number", default: 0.7, description: "Area fill opacity (0-1)" },
      showLine: { type: "boolean", default: true, description: "Show stroke line on top of area" },
      lineWidth: { type: "number", default: 2 },
      forecast: { type: "object", description: "Forecast overlay config — tagged training/observed/forecast region with optional envelope. See ForecastConfig." },
      anomaly: { type: "object", description: "Anomaly overlay config — ±σ band + anomaly dot annotations. See AnomalyConfig." },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["forecast", "anomaly", "series-features"],
    },
  },

  DifferenceChart: {
    name: "DifferenceChart",
    category: "xy",
    description: "Two-series difference chart: fills the area between series A and series B with a color that switches at each crossover — A's color where A > B, B's color where B > A. Crossovers are linearly interpolated so segments meet at zero-width vertices. Both series can be drawn as overlay lines on top of the fill. Classic uses: temperature anomaly (actual vs. normal), forecast accuracy (actual vs. predicted), budget variance.",
    required: [],
    dataShape: "array",
    dataAccessors: ["xAccessor", "seriesAAccessor", "seriesBAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      data: { type: "array", description: "Array of `{x, a, b}` objects. Omit for push API mode." },
      xAccessor: { type: ["string", "function"], default: "x", description: "Key for x values" },
      seriesAAccessor: { type: ["string", "function"], default: "a", description: "Key for series A values" },
      seriesBAccessor: { type: ["string", "function"], default: "b", description: "Key for series B values" },
      seriesALabel: { type: "string", default: "A", description: "Display label for series A in legend + tooltip" },
      seriesBLabel: { type: "string", default: "B", description: "Display label for series B" },
      seriesAColor: { type: "string", description: "Fill color when series A is higher. Defaults to var(--semiotic-danger)." },
      seriesBColor: { type: "string", description: "Fill color when series B is higher. Defaults to var(--semiotic-info)." },
      showLines: { type: "boolean", default: true, description: "Draw the two series as overlay lines on top of the fill" },
      lineWidth: { type: "number", default: 1.5 },
      showPoints: { type: "boolean", default: false, description: "Show points at each data vertex on the overlay lines" },
      pointRadius: { type: "number", default: 3 },
      curve: { type: "string", enum: CURVE_ENUM, default: "linear" },
      areaOpacity: { type: "number", default: 0.6, description: "Difference fill opacity (0-1)" },
      gradientFill: { type: ["boolean", "object"], description: "Tip→base gradient across each segment; same shape as AreaChart.gradientFill" },
      xExtent: { type: "array", description: "Fixed x domain `[min, max]`. Either bound may be `undefined`." },
      yExtent: { type: "array", description: "Fixed y domain `[min, max]`. Either bound may be `undefined`." },
      pointIdAccessor: { type: ["string", "function"], description: "Stable ID for push-mode remove()/update()" },
      windowSize: { type: "number", description: "Max raw rows in the push buffer; older rows evict FIFO. Recommended for long-running streams." },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["crossover-segmentation"],
    },
  },

  StackedAreaChart: {
    name: "StackedAreaChart",
    category: "xy",
    description: "Stacked area chart with optional normalization to 100%. Use for part-to-whole trends over time.",
    required: ["data", "areaBy"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      xAccessor: { type: ["string", "function"], default: "x" },
      yAccessor: { type: ["string", "function"], default: "y" },
      areaBy: { type: ["string", "function"], description: "Key to group data into stacked areas" },
      lineDataAccessor: { type: "string", default: "coordinates" },
      curve: { type: "string", enum: CURVE_ENUM, default: "monotoneX" },
      areaOpacity: { type: "number", default: 0.7 },
      showLine: { type: "boolean", default: true },
      lineWidth: { type: "number", default: 2 },
      normalize: { type: "boolean", default: false, description: "Normalize stacks to 100%" },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["stack", "streamgraph"],
    },
  },

  Scatterplot: {
    name: "Scatterplot",
    category: "xy",
    description: "Individual data points plotted by x/y position with optional size and color encoding.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      xAccessor: { type: ["string", "function"], default: "x" },
      yAccessor: { type: ["string", "function"], default: "y" },
      sizeBy: { type: ["string", "function"], description: "Key for variable point sizing" },
      sizeRange: { type: "array", default: [3, 15], description: "Min and max radius for sizeBy scaling" },
      pointRadius: { type: "number", default: 5, description: "Fixed point radius" },
      pointOpacity: { type: "number", default: 0.8 },
      regression: {
        type: ["boolean", "string", "object"],
        description: "Overlay a regression line. true = linear, 'linear' | 'polynomial' | 'loess' = method, or full RegressionConfig object. Sugar over the trend annotation.",
      },
      forecast: { type: "object", description: "Forecast overlay config — tagged future points + optional envelope. See ForecastConfig." },
      anomaly: { type: "object", description: "Anomaly overlay config — ±σ band + anomaly dot annotations. See AnomalyConfig." },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["regression-overlay", "forecast", "anomaly", "series-features"],
    },
  },

  BubbleChart: {
    name: "BubbleChart",
    category: "xy",
    description: "Scatterplot with required size dimension for three-variable comparison. Bubble area encodes a numeric value.",
    required: ["data", "sizeBy"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      sizeBy: { type: ["string", "function"], description: "Key for bubble size (required)" },
      xAccessor: { type: ["string", "function"], default: "x" },
      yAccessor: { type: ["string", "function"], default: "y" },
      sizeRange: { type: "array", default: [5, 40] },
      bubbleOpacity: { type: "number", default: 0.6 },
      bubbleStrokeWidth: { type: "number", default: 1 },
      bubbleStrokeColor: { type: "string", default: "white" },
      regression: {
        type: ["boolean", "string", "object"],
        description: "Overlay a regression line on the bubbles. Same shape as Scatterplot's regression prop.",
      },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["size-encoding", "streaming-domain", "regression-overlay"],
    },
  },

  Heatmap: {
    name: "Heatmap",
    category: "xy",
    description: "Grid/matrix visualization with color-encoded cell values. Use for correlation matrices, time-frequency analysis.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor", "valueAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects with x, y, and value" },
      xAccessor: { type: ["string", "function"], default: "x" },
      yAccessor: { type: ["string", "function"], default: "y" },
      valueAccessor: { type: ["string", "function"], default: "value", description: "Key for the cell value" },
      // Heatmap's colorScheme is a sequential scheme name (different enum
      // from the categorical "category10"-family). Override common bag.
      colorScheme: { type: "string", enum: ["blues", "reds", "greens", "viridis", "custom"] as const },
      // `customColorScale` is a value-color escape hatch — runtime only.
      customColorScale: { type: ["object", "function"], omitFromSchema: true },
      showValues: { type: "boolean", default: false, description: "Display numeric values in cells" },
      // Heatmap is XY-shaped but has a valueAccessor (not yAccessor), so
      // it carries `valueFormat` for cell-value formatting — pulled from
      // the ordinalAxis concept rather than the xyAxis bag.
      valueFormat: { type: "function" },
      cellBorderColor: { type: "string", default: "#fff" },
      cellBorderWidth: { type: "number", default: 1 },
      legendPosition: { type: "string", enum: LEGEND_POSITION_ENUM, default: "right", description: "Position of the gradient legend" },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "sequential", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  QuadrantChart: {
    name: "QuadrantChart",
    category: "xy",
    description: "Scatterplot divided into four labeled, colored quadrants by center lines. Use for BCG matrices, priority matrices, and any 2x2 strategic framework.",
    required: ["quadrants"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      xAccessor: { type: ["string", "function"], default: "x" },
      yAccessor: { type: ["string", "function"], default: "y" },
      xCenter: { type: "number", description: "X-coordinate of the vertical center line. Defaults to midpoint of x domain." },
      yCenter: { type: "number", description: "Y-coordinate of the horizontal center line. Defaults to midpoint of y domain." },
      quadrants: { type: "object", description: "Configuration for the four quadrants: { topRight, topLeft, bottomRight, bottomLeft }, each with { label, color, opacity? }" },
      // `centerlineStyle` is a runtime-only style escape hatch (similar
      // shape to `frameProps`).
      centerlineStyle: { type: "object", omitFromSchema: true },
      showQuadrantLabels: { type: "boolean", default: true },
      quadrantLabelSize: { type: "number", default: 12 },
      sizeBy: { type: ["string", "function"], description: "Key for variable point sizing" },
      sizeRange: { type: "array", default: [3, 15] },
      pointRadius: { type: "number", default: 5 },
      pointOpacity: { type: "number", default: 0.8 },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["quadrants"],
    },
  },

  MultiAxisLineChart: {
    name: "MultiAxisLineChart",
    category: "xy",
    description: "Dual Y-axis line chart for comparing two series with different scales on the same x axis. Data is unitized (normalized to [0,1]) internally; left axis shows series[0] values and right axis shows series[1] values in original units. Falls back to standard multi-line if not exactly 2 series.",
    required: ["series"],
    dataShape: "array",
    dataAccessors: ["xAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects shared by both series" },
      xAccessor: { type: ["string", "function"], default: "x", description: "Key for x values" },
      series: { type: "array", description: "Exactly 2 series configs for dual-axis mode. Each: { yAccessor, label?, color?, format?, extent? }" },
      // Override common-bag colorScheme: MultiAxis can take a string name OR an array.
      colorScheme: { type: ["string", "array"] },
      curve: { type: "string", default: "monotoneX" },
      lineWidth: { type: "number", default: 2 },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: false,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["dual-axis", "hoc-ssr-only"],
    },
  },

  CandlestickChart: {
    name: "CandlestickChart",
    category: "xy",
    description: "OHLC candlestick bars, or a range chart when open/close are omitted. Honors mode (primary/context/sparkline). Range variant degrades cleanly: endpoint dots + wick, sized against canvas height so sparkline rows don't render marble-sized dots.",
    required: ["highAccessor", "lowAccessor"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "highAccessor", "lowAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      data: { type: "array" },
      xAccessor: { type: ["string", "function"], default: "x" },
      highAccessor: { type: ["string", "function"], default: "high", description: "Required. Upper bound (candlestick high or range top)." },
      lowAccessor: { type: ["string", "function"], default: "low", description: "Required. Lower bound (candlestick low or range bottom)." },
      openAccessor: { type: ["string", "function"], description: "Optional. Pair with closeAccessor for OHLC; omit both to render a range chart." },
      closeAccessor: { type: ["string", "function"], description: "Optional. See openAccessor." },
      candlestickStyle: { type: "object", description: "Style overrides." },
      mode: { type: "string", enum: CHART_MODE_ENUM },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["ohlc"],
    },
  },

  ConnectedScatterplot: {
    name: "ConnectedScatterplot",
    category: "xy",
    description: "Scatterplot where points are connected in order, showing trajectories through 2D space. Viridis-colored start→end, white halo under lines.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      xAccessor: { type: ["string", "function"], default: "x", description: "Key for x-axis values" },
      yAccessor: { type: ["string", "function"], default: "y", description: "Key for y-axis values" },
      orderAccessor: { type: ["string", "function"], description: "Key for point ordering (number or Date field)" },
      orderLabel: { type: "string", description: "Label for the ordering metric in tooltips" },
      pointRadius: { type: "number", default: 4, description: "Point radius" },
      pointIdAccessor: { type: ["string", "function"], description: "Accessor for unique point IDs, used by point-anchored annotations" },
      regression: {
        type: ["boolean", "string", "object"],
        description: "Overlay a regression line under the connected path. Same shape as Scatterplot's regression prop.",
      },
      forecast: { type: "object", description: "Forecast overlay config — same shape as LineChart's forecast prop." },
      anomaly: { type: "object", description: "Anomaly overlay config — ±σ band + anomaly dot annotations." },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["regression-overlay", "forecast", "anomaly", "series-features"],
    },
  },

  ScatterplotMatrix: {
    name: "ScatterplotMatrix",
    category: "xy",
    description: "Multi-panel scatterplot grid with crossfilter brushing. Requires data array with numeric fields.",
    required: ["data", "fields"],
    dataShape: "array",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      data: { type: "array" },
      fields: { type: "array" },
    },
    capabilities: {
      renderModes: ["hybrid"],
      // Composite chart — selection / linkedHover / push all flow
      // through the inner Scatterplots, not this top-level wrapper.
      // Consumers wire those features on the cells they configure.
      supportsLegend: true, supportsSelection: false, supportsLinkedHover: false,
      supportsPush: false, supportsSSR: false,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["matrix", "brush", "composite-delegates-interaction", "hoc-ssr-only"],
    },
  },

  MinimapChart: {
    name: "MinimapChart",
    category: "xy",
    description: "Overview + detail chart with linked zoom. Wraps an XY chart with a minimap navigation pane.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      data: { type: "array" },
    },
    capabilities: {
      renderModes: ["hybrid"],
      // Interactive composite — wraps an inner XY chart with a brush
      // overview. Selection / linkedHover / push all flow through the
      // wrapped chart's own ref and props; this wrapper doesn't
      // wire them at its level.
      supportsLegend: true, supportsSelection: false, supportsLinkedHover: false,
      supportsPush: false, supportsSSR: false,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["brush", "overview-detail", "composite-delegates-interaction", "hoc-ssr-only"],
    },
  },

  // ─── Network family ──────────────────────────────────────────────────

  ForceDirectedGraph: {
    name: "ForceDirectedGraph",
    category: "network",
    description: "Physics-based node-link diagram. Use for relationships, social networks, knowledge graphs.",
    required: ["nodes", "edges"],
    dataShape: "network",
    dataAccessors: ["nodeIDAccessor", "sourceAccessor", "targetAccessor"],
    propBags: ["common"],
    ownProps: {
      nodes: { type: "array", description: "Array of node objects" },
      edges: { type: "array", description: "Array of edge objects with source and target" },
      nodeIDAccessor: { type: ["string", "function"], default: "id", description: "Key for node unique identifier" },
      sourceAccessor: { type: ["string", "function"], default: "source", description: "Key for edge source node ID" },
      targetAccessor: { type: ["string", "function"], default: "target", description: "Key for edge target node ID" },
      nodeLabel: { type: ["string", "function"], description: "Key or accessor for node labels" },
      nodeSize: { type: ["number", "string", "function"], default: 8, description: "Fixed node radius or key for variable sizing" },
      nodeSizeRange: { type: "array", default: [5, 20] },
      edgeWidth: { type: ["number", "string", "function"], default: 1, description: "Fixed edge width or key for variable width" },
      edgeColor: { type: "string", default: "#999" },
      edgeOpacity: { type: "number", default: 0.6 },
      iterations: { type: "number", default: 300, description: "Force simulation iterations" },
      forceStrength: { type: "number", default: 0.1 },
      showLabels: { type: "boolean", default: false },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["force-simulation"],
    },
  },

  SankeyDiagram: {
    name: "SankeyDiagram",
    category: "network",
    description: "Flow diagram showing weighted connections between nodes. Use for flows, budgets, process mapping.",
    required: ["edges"],
    dataShape: "network",
    dataAccessors: ["sourceAccessor", "targetAccessor"],
    propBags: ["common"],
    ownProps: {
      edges: { type: "array", description: "Array of edge objects with source, target, and value" },
      nodes: { type: "array", description: "Optional array of node objects (auto-derived from edges if omitted)" },
      sourceAccessor: { type: ["string", "function"], default: "source" },
      targetAccessor: { type: ["string", "function"], default: "target" },
      valueAccessor: { type: ["string", "function"], default: "value", description: "Key for edge flow value" },
      nodeIdAccessor: { type: ["string", "function"], default: "id" },
      edgeColorBy: { type: ["string", "function"], enum: ["source", "target", "gradient"] as const, default: "source", description: "How to color edges" },
      orientation: { type: "string", enum: ORIENTATION_ENUM, default: "horizontal" },
      nodeAlign: { type: "string", enum: ["justify", "left", "right", "center"] as const, default: "justify" },
      nodePaddingRatio: { type: "number", default: 0.05 },
      nodeWidth: { type: "number", default: 15 },
      nodeLabel: { type: ["string", "function"], description: "Key for node labels" },
      showLabels: { type: "boolean", default: true },
      edgeOpacity: { type: "number", default: 0.5 },
      // `edgeSort` is a comparator function — runtime-only.
      edgeSort: { type: "function", omitFromSchema: true },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  ProcessSankey: {
    name: "ProcessSankey",
    category: "network",
    description: "Temporal sankey with a real time x-axis. Edges carry startTime/endTime; nodes can declare an explicit xExtent lifetime. Use for timestamped flow events (PR commits, campaign-finance contributions, supply-chain shipments).",
    // `edges` is intentionally NOT required: ProcessSankey supports
    // push-mode where edges arrives via the ref. Only `domain` is
    // structurally required because the time axis can't degrade
    // without it.
    required: ["domain"],
    dataShape: "network",
    dataAccessors: ["sourceAccessor", "targetAccessor"],
    propBags: ["common"],
    ownProps: {
      edges: { type: "array", description: "Array of timed edge records with source, target, value, startTime, endTime. Omit for push-mode." },
      nodes: { type: "array", description: "Optional array of node objects. Nodes may carry an `xExtent: [start, end]` to bound the lane explicitly." },
      domain: { type: "array", description: "[tStart, tEnd] of the chart's x-axis (required)." },
      axisTicks: { type: "array", description: "Optional [{ date, label }] tick array for the time axis." },
      sourceAccessor: { type: ["string", "function"], default: "source" },
      targetAccessor: { type: ["string", "function"], default: "target" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      nodeIdAccessor: { type: ["string", "function"], default: "id" },
      startTimeAccessor: { type: ["string", "function"], default: "startTime" },
      endTimeAccessor: { type: ["string", "function"], default: "endTime" },
      xExtentAccessor: { type: ["string", "function"], default: "xExtent" },
      edgeIdAccessor: { type: ["string", "function"], default: "id" },
      legendPosition: { type: "string", enum: ["right", "left", "top", "bottom"] as const, default: "right" },
      pairing: { type: "string", enum: ["value", "temporal"] as const, default: "temporal", description: "Edge-side pairing strategy at transit nodes." },
      packing: { type: "string", enum: ["off", "reuse"] as const, default: "reuse", description: "Lane reuse — pack lifetime-disjoint nodes into the same row." },
      laneOrder: { type: "string", enum: ["insertion", "crossing-min", "inside-out", "crossing-min+inside-out"] as const, default: "crossing-min" },
      ribbonLane: { type: "string", enum: ["source", "target", "both"] as const, default: "both" },
      lifetimeMode: { type: "string", enum: ["full", "half"] as const, default: "half" },
      showLaneRails: { type: "boolean", default: false },
      showQualityReadout: { type: "boolean", default: false },
      edgeOpacity: { type: "number", default: 0.35 },
      timeFormat: { type: "function", omitFromSchema: true },
      valueFormat: { type: "function", omitFromSchema: true },
      showParticles: { type: "boolean", default: false },
      particleStyle: { type: "object", description: "ParticleStyle config — same shape as SankeyDiagram. Defaults from DEFAULT_PARTICLE_STYLE (radius 3, opacity 0.7, spawnRate 0.1, maxPerEdge 50)." },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "custom",
      specialFeatures: ["temporal", "particles", "lane-reuse"],
    },
  },

  ChordDiagram: {
    name: "ChordDiagram",
    category: "network",
    description: "Circular diagram showing inter-relationships and flow volumes between groups.",
    required: ["edges"],
    dataShape: "network",
    dataAccessors: ["sourceAccessor", "targetAccessor"],
    propBags: ["common"],
    ownProps: {
      edges: { type: "array", description: "Array of edge objects with source, target, and value" },
      nodes: { type: "array", description: "Optional array of node objects" },
      sourceAccessor: { type: ["string", "function"], default: "source" },
      targetAccessor: { type: ["string", "function"], default: "target" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      nodeIdAccessor: { type: ["string", "function"], default: "id" },
      edgeColorBy: { type: ["string", "function"], enum: ["source", "target"] as const, default: "source" },
      padAngle: { type: "number", default: 0.01 },
      groupWidth: { type: "number", default: 20 },
      // `sortGroups` is a comparator function — runtime-only.
      sortGroups: { type: "function", omitFromSchema: true },
      nodeLabel: { type: ["string", "function"] },
      showLabels: { type: "boolean", default: true },
      edgeOpacity: { type: "number", default: 0.5 },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: false, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  TreeDiagram: {
    name: "TreeDiagram",
    category: "network",
    description: "Hierarchical tree layout. Supports tree, cluster, partition, and radial orientations. Data is a single root node with children.",
    required: ["data"],
    dataShape: "object",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      data: { type: "object", description: "Root node object with nested children" },
      layout: { type: "string", enum: ["tree", "cluster", "partition", "treemap", "circlepack"] as const, default: "tree" },
      orientation: { type: "string", enum: ["vertical", "horizontal", "radial"] as const, default: "vertical" },
      childrenAccessor: { type: ["string", "function"], default: "children", description: "Key for the children array in each node" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      nodeIdAccessor: { type: ["string", "function"], default: "name" },
      colorByDepth: { type: "boolean", default: false, description: "Color nodes by their depth in the hierarchy" },
      edgeStyle: { type: "string", enum: ["line", "curve"] as const, default: "curve" },
      nodeLabel: { type: ["string", "function"] },
      showLabels: { type: "boolean", default: true },
      nodeSize: { type: "number", default: 5 },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: false, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: false, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["hierarchy"],
    },
  },

  Treemap: {
    name: "Treemap",
    category: "network",
    description: "Space-filling rectangular hierarchy visualization. Data is a single root node with nested children.",
    required: ["data"],
    dataShape: "object",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      data: { type: "object", description: "Root node object with nested children" },
      childrenAccessor: { type: ["string", "function"], default: "children" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      nodeIdAccessor: { type: ["string", "function"], default: "name" },
      colorByDepth: { type: "boolean", default: false },
      showLabels: { type: "boolean", default: true },
      nodeLabel: { type: ["string", "function"] },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: false, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: false, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["hierarchy"],
    },
  },

  CirclePack: {
    name: "CirclePack",
    category: "network",
    description: "Nested circles representing hierarchical data. Data is a single root node with nested children.",
    required: ["data"],
    dataShape: "object",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      data: { type: "object", description: "Root node object with nested children" },
      childrenAccessor: { type: ["string", "function"], default: "children" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      nodeIdAccessor: { type: ["string", "function"], default: "name" },
      colorByDepth: { type: "boolean", default: false },
      showLabels: { type: "boolean", default: true },
      nodeLabel: { type: ["string", "function"] },
      circleOpacity: { type: "number", default: 0.7 },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: false, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: false, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["hierarchy"],
    },
  },

  OrbitDiagram: {
    name: "OrbitDiagram",
    category: "network",
    description: "Animated orbital diagram showing hierarchical data as nodes orbiting a center. Supports flat, solar, atomic, and custom ring arrangements.",
    required: ["data"],
    dataShape: "object",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      data: { type: "object", description: "Hierarchical root object with children: { name: 'root', children: [...] }" },
      childrenAccessor: { type: ["string", "function"], default: "children", description: "Key to access children from each datum" },
      nodeIdAccessor: { type: ["string", "function"], default: "name", description: "Key to identify each node" },
      colorByDepth: { type: "boolean", default: false, description: "Color by hierarchy depth" },
      orbitMode: { type: ["string", "array"], default: "flat", description: "Ring arrangement: 'flat', 'solar', 'atomic', or number[]" },
      orbitSize: { type: ["number", "function"], default: 2.95, description: "Ring size divisor per depth" },
      speed: { type: "number", default: 0.25, description: "Orbit speed in degrees per frame" },
      eccentricity: { type: ["number", "function"], default: 1, description: "Vertical squash for elliptical orbits (1 = circle)" },
      showRings: { type: "boolean", default: true, description: "Show orbital ring paths" },
      nodeRadius: { type: ["number", "function"], default: 6, description: "Node radius" },
      showLabels: { type: "boolean", default: false, description: "Show node labels" },
      animated: { type: "boolean", default: true, description: "Enable animation" },
      // `revolution` is a per-node phase override — runtime-only.
      revolution: { type: "function", omitFromSchema: true },
      // `foregroundGraphics` is a render-on-top escape hatch (StreamFrame
      // pass-through), runtime-only.
      foregroundGraphics: { type: "object", omitFromSchema: true },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: false, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: false, supportsSSR: false,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["hierarchy", "animated", "hoc-ssr-only"],
    },
  },

  // ─── Geo family ──────────────────────────────────────────────────────

  ChoroplethMap: {
    name: "ChoroplethMap",
    category: "geo",
    description: "Geographic choropleth map with colored regions based on data values.",
    required: ["areas"],
    dataShape: "array",
    dataAccessors: ["valueAccessor"],
    propBags: ["common"],
    ownProps: {
      areas: { type: ["array", "string"], description: "GeoJSON features or reference geography name" },
      valueAccessor: { type: ["string", "function"] },
      colorScheme: { type: ["string", "array"] },
      projection: { type: "string", default: "equalEarth" },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      // Values live on `feature.properties` — streaming is per-region
      // value updates (`mergeData(features, liveRows, { featureKey })`)
      // re-passed through the `areas` prop. The shared array-append
      // push API doesn't fit this property-keyed update pattern; the
      // controlled-prop pattern is the natural realtime API. See the
      // docs streaming demo on `/charts/choropleth-map`.
      supportsPush: false, supportsSSR: true,
      colorModel: "sequential", layoutMode: "plugin",
      specialFeatures: ["controlled-prop-streaming"],
    },
  },

  ProportionalSymbolMap: {
    name: "ProportionalSymbolMap",
    category: "geo",
    description: "Geographic map with sized symbols at point locations.",
    required: ["points"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common"],
    ownProps: {
      points: { type: "array" },
      xAccessor: { type: ["string", "function"], default: "lon" },
      yAccessor: { type: ["string", "function"], default: "lat" },
      sizeBy: { type: ["string", "function"] },
      areas: { type: ["array", "string"] },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      // Points are array-shaped — push appends to the displayed
      // points list via `useFrameImperativeHandle({ variant: "geo-points" })`.
      supportsPush: true, supportsSSR: true,
      colorModel: "sequential", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  FlowMap: {
    name: "FlowMap",
    category: "geo",
    description: "Geographic flow map showing movement between locations with animated particles.",
    required: ["flows"],
    dataShape: "array",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      flows: { type: "array" },
      nodes: { type: "array" },
      valueAccessor: { type: ["string", "function"] },
      lineIdAccessor: { type: ["string", "function"] },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      // Push API translates flow → resolved-line through nodeLookup HOC-side,
      // then forwards to the frame's `pushLine`/`pushManyLines` via the
      // `geo-lines` variant in `useFrameImperativeHandle`.
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["particles"],
    },
  },

  DistanceCartogram: {
    name: "DistanceCartogram",
    category: "geo",
    description: "Cartogram distorting geographic positions based on travel time or cost from a center point.",
    required: ["points"],
    dataShape: "array",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      points: { type: "array" },
      center: { type: "array" },
      costAccessor: { type: ["string", "function"] },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      // Points are array-shaped — push appends to the displayed
      // points list. Cost-driven distortion re-runs on each push.
      supportsPush: true, supportsSSR: false,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["distortion", "hoc-ssr-only"],
    },
  },

  // ─── Realtime family ────────────────────────────────────────────────
  // Push-only HOCs: data arrives via the ref API, not props. dataShape is
  // "realtime" and `required` is empty since the schema describes the
  // initial config, not a static dataset.

  RealtimeLineChart: {
    name: "RealtimeLineChart",
    category: "realtime",
    description: "Streaming line chart rendered on canvas. Uses ref-based push API for high-frequency data.",
    required: [],
    dataShape: "realtime",
    dataAccessors: [],
    propBags: ["realtime"],
    ownProps: {
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      strokeDasharray: { type: "string" },
      transition: { type: "object", description: "Transition config: { duration, easing }" },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: false,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["live-stream"],
    },
  },

  RealtimeHistogram: {
    name: "RealtimeHistogram",
    category: "realtime",
    description: "Streaming bar chart with binned aggregation. Uses ref-based push API.",
    required: ["binSize"],
    dataShape: "realtime",
    dataAccessors: [],
    propBags: ["realtime"],
    ownProps: {
      binSize: { type: "number", description: "Time bin size in milliseconds (required)" },
      categoryAccessor: { type: ["string", "function"], description: "Key for category grouping" },
      colors: { type: "object", description: "Map of category to color string" },
      fill: { type: "string" },
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      gap: { type: "number" },
      brush: { type: ["boolean", "string", "object"], description: "Enable brush selection. true defaults to { dimension: \"x\", snap: \"bin\" }. String: \"x\". Object: { dimension, snap: \"continuous\"|\"bin\", snapDuring }." },
      onBrush: { type: "function", description: "Callback when brush extent changes: (extent | null) => void" },
      linkedBrush: { type: ["string", "object"], description: "Cross-chart brush coordination via LinkedCharts. String: selection name. Object: { name, xField, yField }." },
      transition: { type: "object", description: "Transition config: { duration, easing }" },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: false,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["live-stream", "brush"],
    },
  },

  RealtimeSwarmChart: {
    name: "RealtimeSwarmChart",
    category: "realtime",
    description: "Streaming swarm/scatter chart showing individual data points over time.",
    required: [],
    dataShape: "realtime",
    dataAccessors: [],
    propBags: ["realtime"],
    ownProps: {
      categoryAccessor: { type: ["string", "function"] },
      colors: { type: "object" },
      radius: { type: "number" },
      fill: { type: "string" },
      opacity: { type: "number" },
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      transition: { type: "object", description: "Transition config: { duration, easing }" },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: false,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["live-stream"],
    },
  },

  RealtimeWaterfallChart: {
    name: "RealtimeWaterfallChart",
    category: "realtime",
    description: "Streaming waterfall chart with positive/negative bars and connectors.",
    required: [],
    dataShape: "realtime",
    dataAccessors: [],
    propBags: ["realtime"],
    ownProps: {
      positiveColor: { type: "string" },
      negativeColor: { type: "string" },
      connectorStroke: { type: "string" },
      connectorWidth: { type: "number" },
      gap: { type: "number" },
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      transition: { type: "object", description: "Transition config: { duration, easing }" },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: false,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["live-stream"],
    },
  },

  RealtimeHeatmap: {
    name: "RealtimeHeatmap",
    category: "realtime",
    description: "Streaming 2D heatmap with binned time and value aggregation.",
    required: [],
    dataShape: "realtime",
    dataAccessors: [],
    propBags: ["realtime"],
    ownProps: {
      heatmapXBins: { type: "number" },
      heatmapYBins: { type: "number" },
      aggregation: { type: "string", enum: ["count", "sum", "mean"] as const },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: false,
      colorModel: "sequential", layoutMode: "plugin",
      specialFeatures: ["live-stream"],
    },
  },
}

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
