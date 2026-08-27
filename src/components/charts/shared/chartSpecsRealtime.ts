import type { ChartSpec } from "./chartSpecCore"
import { STYLE_RULES_PROP_SPEC } from "./styleRulesWireSchema"

export const REALTIME_CHART_SPECS: Record<string, ChartSpec> = {
  RealtimeLineChart: {
    name: "RealtimeLineChart",
    category: "realtime",
    description:
      "Streaming line chart rendered on canvas. Uses ref-based push API for high-frequency data.",
    required: [],
    dataShape: "realtime",
    dataAccessors: [],
    propBags: ["realtime"],
    ownProps: {
      styleRules: STYLE_RULES_PROP_SPEC,
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      strokeDasharray: { type: "string" },
      opacity: { type: "number" },
      aggregate: {
        type: "object",
        description:
          "Windowed event-time aggregation config. Structural changes replay controlled data; push-only streams begin a new aggregate epoch because raw events are not retained."
      },
      eventTime: {
        type: "object",
        description:
          "Out-of-order event buffering and lateness policy. Call RealtimeLineChartHandle.flush() when the source ends to release the grace-window tail in order."
      },
      transition: {
        type: "object",
        description: "Transition config: { duration, easing }"
      }
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true,
      supportsSelection: true,
      supportsLinkedHover: true,
      supportsPush: true,
      supportsSSR: false,
      colorModel: "categorical",
      layoutMode: "plugin",
      specialFeatures: ["live-stream"]
    }
  },

  RealtimeHistogram: {
    name: "RealtimeHistogram",
    category: "realtime",
    description:
      "Streaming bar chart with binned aggregation. Uses ref-based push API.",
    required: ["binSize"],
    dataShape: "realtime",
    dataAccessors: [],
    propBags: ["realtime"],
    ownProps: {
      styleRules: STYLE_RULES_PROP_SPEC,
      binSize: {
        type: "number",
        description: "Time bin size in milliseconds (required)"
      },
      direction: {
        type: "string",
        enum: ["up", "down"] as const,
        default: "up",
        description:
          'Bar growth direction. Use "down" for mirrored histograms; explicit valueExtent is reversed.'
      },
      categoryAccessor: {
        type: ["string", "function"],
        description: "Key for category grouping"
      },
      colors: {
        type: "object",
        description:
          "Category-to-color map. Active keys set stack and legend order first; remaining active categories are alphabetical."
      },
      fill: {
        type: "string",
        description:
          "Bar fill when uncategorized, and fallback for active categories missing from colors."
      },
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      opacity: { type: "number" },
      gap: { type: "number" },
      legend: {
        type: ["array", "object"],
        omitFromSchema: true,
        description:
          "Additional React legend content composed after inferred categories."
      },
      brush: {
        type: ["boolean", "string", "object"],
        description:
          'Enable brush selection. true defaults to { dimension: "x", snap: "bin" }. String: "x". Object: { dimension, snap: "continuous"|"bin", snapDuring }.'
      },
      onBrush: {
        type: "function",
        description:
          "Callback when brush extent changes: (extent | null) => void"
      },
      linkedBrush: {
        type: ["string", "object"],
        description:
          "Cross-chart brush coordination via LinkedCharts. String: selection name. Object: { name, xField, yField }."
      },
      transition: {
        type: "object",
        description: "Transition config: { duration, easing }"
      }
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true,
      supportsSelection: true,
      supportsLinkedHover: true,
      supportsPush: true,
      supportsSSR: false,
      colorModel: "categorical",
      layoutMode: "plugin",
      specialFeatures: ["live-stream", "brush"]
    }
  },

  TemporalHistogram: {
    name: "TemporalHistogram",
    category: "realtime",
    description:
      "Static-data temporal histogram with binned aggregation. Use when data is a bounded array rather than a push stream.",
    required: ["data", "binSize"],
    dataShape: "array",
    dataAccessors: ["timeAccessor", "valueAccessor", "categoryAccessor"],
    propBags: ["realtimeStatic"],
    ownProps: {
      styleRules: STYLE_RULES_PROP_SPEC,
      data: { type: "array", description: "Array of temporal observations" },
      binSize: {
        type: "number",
        description: "Time bin size in milliseconds (required)"
      },
      size: { type: "array", description: "[width, height] in pixels" },
      width: { type: "number", description: "Alias for size[0]" },
      height: { type: "number", description: "Alias for size[1]" },
      margin: {
        type: ["number", "object"],
        description: "Uniform numeric margin or object margin."
      },
      className: { type: "string" },
      timeAccessor: {
        type: ["string", "function"],
        description: "Key for time/x values"
      },
      valueAccessor: {
        type: ["string", "function"],
        description: "Key for y values"
      },
      direction: {
        type: "string",
        enum: ["up", "down"] as const,
        default: "up",
        description:
          'Bar growth direction. Use "down" for mirrored histograms; explicit valueExtent is reversed.'
      },
      categoryAccessor: {
        type: ["string", "function"],
        description: "Key for category grouping"
      },
      colors: {
        type: "object",
        description: "Map of category to color string"
      },
      timeExtent: { type: "array" },
      valueExtent: { type: "array" },
      extentPadding: { type: "number" },
      showAxes: { type: "boolean" },
      background: { type: "string" },
      enableHover: { type: ["boolean", "object"] },
      tooltip: {
        type: ["boolean", "string", "function", "object"],
        description:
          "Tooltip boolean, multi-series mode, content function, or config."
      },
      tooltipContent: { type: "function", omitFromSchema: true },
      onHover: { type: "function", omitFromSchema: true },
      annotations: { type: "array" },
      autoPlaceAnnotations: {
        type: ["boolean", "object"],
        description:
          "Opt-in annotation placement pass for note-like annotations without manual offsets."
      },
      responsiveRules: {
        type: "array",
        description:
          "Semantic responsive transforms applied before chart-mode defaults."
      },
      mobileSemantics: {
        type: "object",
        description:
          "Phone/mobile contract consumed by audits, recipes, adapters, and agents."
      },
      mobileInteraction: {
        type: ["boolean", "object"],
        description:
          "Touch-first interaction policy for phone-sized chart slots."
      },
      svgAnnotationRules: { type: "function", omitFromSchema: true },
      tickFormatTime: { type: "function", omitFromSchema: true },
      tickFormatValue: { type: "function", omitFromSchema: true },
      fill: { type: "string" },
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      opacity: { type: "number" },
      gap: { type: "number" },
      legend: {
        type: ["array", "object"],
        omitFromSchema: true,
        description:
          "Additional React legend content composed after inferred categories."
      },
      transition: {
        type: "object",
        description: "Transition config: { duration, easing }"
      },
      linkedHover: { type: ["boolean", "string", "object"] },
      linkedBrush: {
        type: ["string", "object"],
        description:
          "Cross-chart brush coordination via LinkedCharts. String: selection name. Object: { name, xField, yField }."
      },
      brush: {
        type: ["boolean", "string", "object"],
        description:
          'Enable brush selection. true defaults to { dimension: "x", snap: "bin" }. String: "x". Object: { dimension, snap: "continuous"|"bin", snapDuring }.'
      },
      onBrush: {
        type: "function",
        description:
          "Callback when brush extent changes: (extent | null) => void",
        omitFromSchema: true
      }
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true,
      supportsSelection: true,
      supportsLinkedHover: true,
      supportsPush: false,
      supportsSSR: true,
      colorModel: "categorical",
      layoutMode: "plugin",
      specialFeatures: ["brush"]
    }
  },

  RealtimeSwarmChart: {
    name: "RealtimeSwarmChart",
    category: "realtime",
    description:
      "Streaming swarm/scatter chart showing individual data points over time.",
    required: [],
    dataShape: "realtime",
    dataAccessors: [],
    propBags: ["realtime"],
    ownProps: {
      styleRules: STYLE_RULES_PROP_SPEC,
      categoryAccessor: { type: ["string", "function"] },
      colors: {
        type: "object",
        description: "Category-to-color map for dots."
      },
      radius: { type: "number" },
      fill: {
        type: "string",
        description:
          "Dot fill when uncategorized, and fallback for active categories missing from colors."
      },
      opacity: { type: "number" },
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      pointStyle: {
        type: "function",
        description:
          "Per-datum style callback. Overrides fill, stroke, strokeWidth, opacity, cursor, and radius via r.",
        omitFromSchema: true
      },
      yScaleType: {
        type: "string",
        enum: ["linear", "log", "symlog"],
        description:
          "Value-axis scale. symlog preserves zero and negative values while compressing large magnitudes."
      },
      transition: {
        type: "object",
        description: "Transition config: { duration, easing }"
      }
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true,
      supportsSelection: true,
      supportsLinkedHover: true,
      supportsPush: true,
      supportsSSR: false,
      colorModel: "categorical",
      layoutMode: "plugin",
      specialFeatures: ["live-stream"]
    }
  },

  RealtimeWaterfallChart: {
    name: "RealtimeWaterfallChart",
    category: "realtime",
    description:
      "Streaming waterfall chart with positive/negative bars and connectors.",
    required: [],
    dataShape: "realtime",
    dataAccessors: [],
    propBags: ["realtime"],
    ownProps: {
      styleRules: STYLE_RULES_PROP_SPEC,
      positiveColor: { type: "string" },
      negativeColor: { type: "string" },
      connectorStroke: { type: "string" },
      connectorWidth: { type: "number" },
      gap: { type: "number" },
      stroke: { type: "string" },
      strokeWidth: { type: "number" },
      opacity: { type: "number" },
      transition: {
        type: "object",
        description: "Transition config: { duration, easing }"
      }
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true,
      supportsSelection: true,
      supportsLinkedHover: true,
      supportsPush: true,
      supportsSSR: false,
      colorModel: "categorical",
      layoutMode: "plugin",
      specialFeatures: ["live-stream"]
    }
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
      styleRules: STYLE_RULES_PROP_SPEC,
      heatmapXBins: { type: "number" },
      heatmapYBins: { type: "number" },
      aggregation: { type: "string", enum: ["count", "sum", "mean"] as const },
      categoryAccessor: {
        type: ["string", "function"],
        description:
          "Optional category accessor retained on heatmap source rows."
      },
      colorScheme: {
        type: "string",
        enum: [
          "blues",
          "reds",
          "greens",
          "viridis",
          "oranges",
          "purples",
          "greys",
          "plasma",
          "inferno",
          "magma",
          "cividis",
          "turbo",
          "custom"
        ] as const
      },
      // Must be callable — see the Heatmap spec's note.
      customColorScale: { type: "function", omitFromSchema: true }
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true,
      supportsSelection: true,
      supportsLinkedHover: true,
      supportsPush: true,
      supportsSSR: false,
      colorModel: "sequential",
      layoutMode: "plugin",
      specialFeatures: ["live-stream"]
    }
  }
}
