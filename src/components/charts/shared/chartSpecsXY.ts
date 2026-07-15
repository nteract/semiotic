import type { ChartSpec } from "./chartSpecCore"
import {
  LEGEND_POSITION_ENUM,
  CURVE_ENUM,
  CHART_MODE_ENUM
} from "./chartSpecCore"
import { DEFAULT_QUADRANTS } from "../xy/QuadrantChart.defaults"

export const XY_CHART_SPECS: Record<string, ChartSpec> = {
  LineChart: {
    name: "LineChart",
    category: "xy",
    description: "Line traces with curve interpolation, area fill, and point markers. Use for time series, trends, and continuous data.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      styleRules: { type: "array", omitFromSchema: true, description: "Declarative threshold-aware styling: ordered { when, style } rules, last-applicable rule wins. A rule's fill may be a color or a HatchFill descriptor." },
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
      band: { type: ["object", "array"], description: "Asymmetric min/max envelope drawn under the line. `{ y0Accessor, y1Accessor, style?, perSeries?, interactive? }` or an array of those for percentile fans. Distinct from `forecast`/`anomaly` (computed) — band is pure data passthrough. Hovered datum is enriched with `band: { y0, y1 }` and `bands: [...]`." },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      // `series-features` umbrella tag = uses the shared
      // `useSeriesFeatures` hook; the specific `forecast` / `anomaly`
      // tags describe individual capabilities for AI discovery.
      specialFeatures: ["forecast", "anomaly", "band", "series-features", "gap-handling", "direct-labels", "endpoint-labels"],
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
      styleRules: { type: "array", omitFromSchema: true, description: "Declarative threshold-aware styling: ordered { when, style } rules, last-applicable rule wins. A rule's fill may be a color or a HatchFill descriptor." },
      data: { type: "array", description: "Array of data objects" },
      xAccessor: { type: ["string", "function"], default: "x", description: "Key for x-axis values" },
      yAccessor: { type: ["string", "function"], default: "y", description: "Key for y-axis values" },
      areaBy: { type: ["string", "function"], description: "Key to group data into separate areas" },
      lineDataAccessor: { type: "string", default: "coordinates", description: "Key for the coordinates array within each area object" },
      curve: { type: "string", enum: CURVE_ENUM, default: "monotoneX" },
      gradientFill: { type: ["boolean", "object"], description: "Renderer-space area gradient. true uses default opacity; object supports opacity or colorStops." },
      semanticGradient: { type: "array", description: "User-facing gradient stops: [{ at: 0-100, color, opacity? }], where 0 is baseline and 100 is line/top. Takes precedence over gradientFill." },
      areaOpacity: { type: "number", default: 0.7, description: "Area fill opacity (0-1)" },
      showLine: { type: "boolean", default: true, description: "Show stroke line on top of area" },
      lineWidth: { type: "number", default: 2 },
      forecast: { type: "object", description: "Forecast overlay config — tagged training/observed/forecast region with optional envelope. See ForecastConfig." },
      anomaly: { type: "object", description: "Anomaly overlay config — ±σ band + anomaly dot annotations. See AnomalyConfig." },
      band: { type: ["object", "array"], description: "Asymmetric min/max envelope drawn under the area. See LineChart.band — same shape, same enrichment." },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["forecast", "anomaly", "band", "series-features"],
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
      styleRules: { type: "array", omitFromSchema: true, description: "Declarative threshold-aware styling: ordered { when, style } rules, last-applicable rule wins. A rule's fill may be a color or a HatchFill descriptor." },
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
      styleRules: { type: "array", omitFromSchema: true, description: "Declarative threshold-aware styling: ordered { when, style } rules, last-applicable rule wins. A rule's fill may be a color or a HatchFill descriptor." },
      data: { type: "array", description: "Array of data objects" },
      xAccessor: { type: ["string", "function"], default: "x" },
      yAccessor: { type: ["string", "function"], default: "y" },
      sizeBy: { type: ["string", "function"], description: "Key for variable point sizing" },
      sizeRange: { type: "array", default: [3, 15], description: "Min and max radius for sizeBy scaling" },
      symbolBy: { type: ["string", "function"], description: "Categorical field → glyph shape; each mark renders as a d3-shape glyph (circle/square/triangle/diamond/star/cross/wye/chevron) instead of a circle." },
      symbolMap: { type: "object", description: "Explicit {category → shape} map for symbolBy; unmapped categories auto-assign." },
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
      styleRules: { type: "array", omitFromSchema: true, description: "Declarative threshold-aware styling: ordered { when, style } rules, last-applicable rule wins. A rule's fill may be a color or a HatchFill descriptor." },
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
    required: [],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common", "xyAxis"],
    ownProps: {
      styleRules: { type: "array", omitFromSchema: true, description: "Declarative threshold-aware styling: ordered { when, style } rules, last-applicable rule wins. A rule's fill may be a color or a HatchFill descriptor." },
      data: { type: "array", description: "Array of data objects" },
      xAccessor: { type: ["string", "function"], default: "x" },
      yAccessor: { type: ["string", "function"], default: "y" },
      xCenter: { type: "number", description: "X-coordinate of the vertical center line. Defaults to midpoint of x domain." },
      yCenter: { type: "number", description: "Y-coordinate of the horizontal center line. Defaults to midpoint of y domain." },
      quadrants: { type: "object", default: DEFAULT_QUADRANTS, description: "Optional configuration overrides for the four quadrants: { topRight, topLeft, bottomRight, bottomLeft }, each with partial { label, color, opacity }. Omitted quadrants and fields use built-in defaults." },
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
      styleRules: { type: "array", omitFromSchema: true, description: "Declarative threshold-aware styling: ordered { when, style } rules, last-applicable rule wins. A rule's fill may be a color or a HatchFill descriptor." },
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

}
