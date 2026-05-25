import type { StreamChartCapability } from "../../ai/streamingTypes"

export const RealtimeLineChartCapability: StreamChartCapability = {
  component: "RealtimeLineChart",
  importPath: "semiotic/realtime",
  rubric: { familiarity: 4, accuracy: 4, precision: 3 },

  fits: (schema) => {
    if (!schema.fields.some((f) => f.kind === "date" || f.role === "x")) {
      return "needs a date/time field for the x axis"
    }
    if (!schema.fields.some((f) => f.kind === "numeric" || f.role === "y" || f.role === "value")) {
      return "needs a numeric value field"
    }
    if (schema.throughput === "high") {
      return "for high-throughput streams, prefer RealtimeHeatmap or RealtimeWaterfallChart"
    }
    return null
  },

  intentScores: {
    "trend": 5,
    "change-detection": 4,
    // RealtimeLineChart doesn't split into multiple series — one
    // (time, value) line per chart instance — so compare-series is a poor fit.
    "outlier-detection": 2,
  },

  caveats: (schema) => {
    const out: string[] = []
    if (schema.retention === "cumulative") {
      out.push("cumulative retention will eventually exhaust the buffer — set a windowSize or downsample")
    }
    return out
  },

  buildProps: (schema) => {
    const timeField = schema.fields.find((f) => f.role === "x" || f.kind === "date")?.name
    const valueField = schema.fields.find((f) => f.role === "y" || f.role === "value" || f.kind === "numeric")?.name
    return {
      timeAccessor: timeField,
      valueAccessor: valueField,
    }
  },
}
