/**
 * Single source of truth for per-chart prop specifications.
 *
 * Three downstream consumers used to maintain their own per-chart entries:
 *   - `ai/schema.json`                                    (LLM tool definitions)
 *   - `src/components/charts/shared/validationMap.ts`     (runtime prop validation)
 *   - `ai/componentMetadata.cjs`                          (category buckets)
 *
 * Generators in `scripts/generate-*.mjs` walk `CHART_SPECS` and emit those
 * three files. `npm run docs:chart-specs` regenerates them; `check:chart-specs`
 * fails the build on drift between this registry and the generated files.
 *
 * Design notes:
 *   - Shared prop bags (common, xyAxis, ordinalAxis) live in `PROP_BAGS` and
 *     are referenced by name in each spec so common surface stays in one place.
 *   - The runtime PropType set ("string" | "number" | "boolean" | "array" |
 *     "object" | "function") is broader than JSON Schema's. The schema
 *     generator strips "function" before emitting because LLMs cannot supply
 *     function values; validationMap keeps all types because runtime callers do.
 *   - Props relevant only at runtime (e.g. `tooltip`, `onClick`, `frameProps`)
 *     are tagged `omitFromSchema: true` so they appear in validationMap but
 *     not in schema.json. Conversely, `description` and `default` annotations
 *     surface in schema.json (and MCP responses) but are dropped from
 *     validationMap (which only reads `type` and `enum`).
 */

export type PropType = "string" | "number" | "boolean" | "array" | "object" | "function"
export type DataShape = "array" | "object" | "network" | "realtime" | "none"
export type ChartCategory = "xy" | "ordinal" | "network" | "geo" | "realtime"

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
  tooltip: { type: ["boolean", "function", "object"], omitFromSchema: true },
  annotations: { type: "array" },
  frameProps: { type: "object", omitFromSchema: true },
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
  valueFormat: { type: "function", omitFromSchema: true },
  categoryFormat: { type: "function", omitFromSchema: true },
}

export const PROP_BAGS = {
  common: commonProps,
  xyAxis: xyAxisProps,
  ordinalAxis: ordinalAxisProps,
} as const

// ---------------------------------------------------------------------------
// Reusable enums
// ---------------------------------------------------------------------------

export const ORIENTATION_ENUM = ["vertical", "horizontal"] as const
export const HORIZONTAL_VERTICAL_ENUM = ["horizontal", "vertical"] as const
export const LEGEND_POSITION_ENUM = ["right", "left", "top", "bottom"] as const

// ---------------------------------------------------------------------------
// Chart specs (Phase 2: BarChart + 14 ordinal charts)
// ---------------------------------------------------------------------------
//
// Drift annotations (`omitFromSchema: true`) preserve the canonical Phase 2
// surface. Phase 3+ can drop these omits to expose the prop to LLM tools
// once we've audited each addition individually.

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
      barPadding: { type: "number", default: 5 },
      // `roundedTop` is in validationMap but absent from schema.json —
      // hand-curation oversight. Phase 3 can re-baseline schema with it
      // exposed; for now match the canonical surface.
      roundedTop: { type: "number", omitFromSchema: true },
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
      barPadding: { type: "number", default: 5 },
      roundedTop: { type: "number", omitFromSchema: true },
      // Canonical schema flags `true` for stacked bars to surface the legend.
      showLegend: { type: "boolean", default: true },
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
      barPadding: { type: "number", default: 5 },
      roundedTop: { type: "number", omitFromSchema: true },
      // Canonical schema flags `true` for grouped bars to surface the legend.
      showLegend: { type: "boolean", default: true },
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
      sweep: { type: "number", default: 240, description: "Arc sweep angle in degrees (gap centered at bottom)" },
      showNeedle: { type: "boolean", default: true },
      needleColor: { type: "string" },
      // `valueFormat` and `centerContent` carry function-only types in
      // validationMap; schema exposes valueFormat as string-only via the
      // shared bag. centerContent and backgroundColor are runtime-only.
      centerContent: { type: ["object", "string", "number", "function"], omitFromSchema: true },
      valueFormat: { type: "function", omitFromSchema: true },
      showScaleLabels: { type: "boolean", default: true },
      backgroundColor: { type: "string", omitFromSchema: true },
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
      brush: { type: "boolean", description: "Enable value-axis brush selection" },
      onBrush: { type: "function", description: "Callback with { r: [min, max] } or null when brush clears" },
      linkedBrush: { type: ["string", "object"], description: "LinkedCharts brush integration name" },
      showCategoryTicks: { type: "boolean", description: "Show lane labels on the category axis" },
      responsiveWidth: { type: "boolean" },
      legendPosition: { type: "string", enum: LEGEND_POSITION_ENUM },
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
