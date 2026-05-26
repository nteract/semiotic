import type { StreamChartCapability } from "../../ai/streamingTypes"

export const RealtimeWaterfallChartCapability: StreamChartCapability = {
  component: "RealtimeWaterfallChart",
  importPath: "semiotic/realtime",
  rubric: { familiarity: 2, accuracy: 4, precision: 3 },

  fits: (schema) => {
    if (!schema.fields.some((f) => f.kind === "date" || f.role === "x")) {
      return "needs a time field"
    }
    if (!schema.fields.some((f) => f.kind === "numeric" || f.role === "value")) {
      return "needs a numeric value field"
    }
    return null
  },

  intentScores: {
    "change-detection": 5,
    "trend": 3,
    "outlier-detection": 4,
    // Waterfalls work especially well at high throughput
    "distribution": (schema) => (schema.throughput === "high" ? 4 : 2),
  },

  buildProps: (schema) => {
    const timeField = schema.fields.find((f) => f.role === "x" || f.kind === "date")?.name
    const valueField = schema.fields.find((f) => f.role === "value" || f.kind === "numeric")?.name
    return {
      timeAccessor: timeField,
      valueAccessor: valueField,
    }
  },
}
