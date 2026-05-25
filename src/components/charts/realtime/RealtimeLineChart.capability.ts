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
    "compare-series": 3,
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
    const xField = schema.fields.find((f) => f.role === "x" || f.kind === "date")?.name
    const yField = schema.fields.find((f) => f.role === "y" || f.role === "value" || f.kind === "numeric")?.name
    const seriesField = schema.fields.find((f) => f.role === "series" || (f.kind === "categorical" && f.role !== "category"))?.name
    return {
      xAccessor: xField,
      yAccessor: yField,
      ...(seriesField ? { lineBy: seriesField, colorBy: seriesField } : {}),
    }
  },
}
