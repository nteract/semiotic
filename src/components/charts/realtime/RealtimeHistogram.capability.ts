import type { StreamChartCapability } from "../../ai/streamingTypes"

export const RealtimeHistogramCapability: StreamChartCapability = {
  component: "RealtimeHistogram",
  importPath: "semiotic/realtime",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },

  fits: (schema) => {
    if (!schema.fields.some((f) => f.kind === "date" || f.role === "x")) {
      return "needs a time field"
    }
    if (!schema.fields.some((f) => f.kind === "numeric" || f.role === "value")) {
      return "needs a numeric field to bin"
    }
    return null
  },

  intentScores: {
    "distribution": 5,
    "outlier-detection": 4,
    "change-detection": 2,
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
