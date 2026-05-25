import type { StreamChartCapability } from "../../ai/streamingTypes"

export const RealtimeHeatmapCapability: StreamChartCapability = {
  component: "RealtimeHeatmap",
  importPath: "semiotic/realtime",
  rubric: { familiarity: 2, accuracy: 3, precision: 2 },

  fits: (schema) => {
    if (!schema.fields.some((f) => f.kind === "date" || f.role === "x")) {
      return "needs a time field for the x axis"
    }
    if (!schema.fields.some((f) => f.kind === "numeric" || f.role === "value")) {
      return "needs a numeric value field"
    }
    // Heatmaps shine at higher throughputs where line charts get cluttered
    return null
  },

  intentScores: {
    // Particularly strong for high-throughput streams where lines would saturate
    "trend": (schema) => (schema.throughput === "high" ? 4 : 2),
    "distribution": 3,
    "change-detection": 3,
    "compare-series": (schema) => {
      const seriesField = schema.fields.find((f) => f.role === "series" || (f.kind === "categorical" && f.role !== "category"))
      return seriesField ? 4 : 1
    },
  },

  buildProps: (schema) => {
    const timeField = schema.fields.find((f) => f.role === "x" || f.kind === "date")?.name
    const valueField = schema.fields.find((f) => f.role === "y" || f.role === "value" || f.kind === "numeric")?.name
    const categoryField = schema.fields.find(
      (f) => f.role === "category" || (f.kind === "categorical" && f.role !== "series"),
    )?.name
    return {
      timeAccessor: timeField,
      valueAccessor: valueField,
      ...(categoryField ? { categoryAccessor: categoryField } : {}),
    }
  },
}
