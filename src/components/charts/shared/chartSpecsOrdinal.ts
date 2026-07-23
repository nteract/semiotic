import type { ChartSpec } from "./chartSpecCore"
import {
  ORIENTATION_ENUM,
  HORIZONTAL_VERTICAL_ENUM,
  LEGEND_POSITION_ENUM
} from "./chartSpecCore"
import { DEFAULT_LIKERT_LEVELS } from "../ordinal/LikertChart.defaults"

export const ORDINAL_CHART_SPECS: Record<string, ChartSpec> = {
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
      roundedTop: { type: "number", omitFromSchema: true },
      valueExtent: { type: "array", omitFromSchema: true },
      styleRules: { type: "array", omitFromSchema: true, description: "Declarative, threshold-aware bar styling: ordered { when, style } rules, last-applicable rule wins per property. A rule's fill may be a color or a HatchFill descriptor." },
      gradientFill: { type: "object", description: "Tip-to-base gradient: { stops: [{ offset: 0-1, color?, opacity? }] }." },
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
      styleRules: { type: "array", omitFromSchema: true, description: "Declarative, threshold-aware segment styling: ordered { when, style } rules (ctx.category is the stack key), last-applicable rule wins. A rule's fill may be a color or a HatchFill descriptor." },
      gradientFill: { type: "object", description: "Tip-to-base gradient: { stops: [{ offset: 0-1, color?, opacity? }] }." },
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
      styleRules: { type: "array", omitFromSchema: true, description: "Declarative, threshold-aware bar styling: ordered { when, style } rules (ctx.category is the group key), last-applicable rule wins. A rule's fill may be a color or a HatchFill descriptor." },
      gradientFill: { type: "object", description: "Tip-to-base gradient: { stops: [{ offset: 0-1, color?, opacity? }] }." },
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
      symbolBy: { type: ["string", "function"], description: "Categorical field → glyph shape; each point renders as a d3-shape glyph instead of a circle." },
      symbolMap: { type: "object", description: "Explicit {category → shape} map for symbolBy; unmapped categories auto-assign." },
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
      gradientFill: { type: "object", description: "Sweep gradient: { stops: [{ offset: 0-1, color?, opacity? }] }. Offset 0 is the sweep start and offset 1 is the sweep end." },
      arcWidth: { type: "number", default: 0.3, description: "Arc thickness as fraction of radius (0-1)" },
      cornerRadius: { type: "number", description: "Pixel radius for rounded segment ends. Same semantics as DonutChart's cornerRadius. Omit for sharp corners." },
      sweep: { type: "number", default: 240, description: "Arc sweep angle in degrees (gap centered at bottom)" },
      fillZones: { type: "boolean", default: true, description: "When true, the arc fills up to the current value; when false, the full arc is shown." },
      showNeedle: { type: "boolean", default: true },
      needleColor: { type: "string" },
      color: { type: "string", description: "Fallback fill color used when no thresholds are defined" },
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
      trackFill: { type: ["string", "object"], omitFromSchema: true, description: "Lane background fill painted behind each swimlane. A color string, or { color, opacity? } for a translucent track." },
      gradientFill: { type: "object", description: "Tip-to-base gradient: { stops: [{ offset: 0-1, color?, opacity? }] }." },
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
    required: [],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor", "levelAccessor", "countAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of raw response or pre-aggregated data objects" },
      levels: { type: "array", default: DEFAULT_LIKERT_LEVELS, description: "Ordered response labels, most negative to most positive. Defaults to a 5-point Very Low to Very High scale. Odd count = center is neutral." },
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

}
