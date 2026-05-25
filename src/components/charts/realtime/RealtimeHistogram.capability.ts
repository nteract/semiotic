import type { StreamChartCapability } from "../../ai/streamingTypes"

export const RealtimeHistogramCapability: StreamChartCapability = {
  component: "RealtimeHistogram",
  importPath: "semiotic/realtime",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },

  fits: (schema) => {
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
    const valueField = schema.fields.find((f) => f.role === "value" || f.kind === "numeric")?.name
    return {
      valueAccessor: valueField,
    }
  },
}
