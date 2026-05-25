import type { StreamChartCapability } from "../../ai/streamingTypes"

/**
 * TemporalHistogram is the bounded sibling of RealtimeHistogram — same chart
 * but for static data with a fixed window. For stream selection it competes
 * with RealtimeHistogram; the choice depends on retention.
 */
export const TemporalHistogramCapability: StreamChartCapability = {
  component: "TemporalHistogram",
  importPath: "semiotic/realtime",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },

  fits: (schema) => {
    if (!schema.fields.some((f) => f.kind === "date" || f.role === "x")) {
      return "needs a time field"
    }
    if (!schema.fields.some((f) => f.kind === "numeric" || f.role === "value")) {
      return "needs a numeric value field"
    }
    if (schema.retention === "windowed") {
      return "windowed retention is RealtimeHistogram's job; TemporalHistogram serves bounded/cumulative data"
    }
    return null
  },

  intentScores: {
    "distribution": 5,
    "change-detection": 3,
    "trend": 2,
  },

  buildProps: (schema) => {
    const valueField = schema.fields.find((f) => f.role === "value" || f.kind === "numeric")?.name
    const xField = schema.fields.find((f) => f.role === "x" || f.kind === "date")?.name
    return { valueAccessor: valueField, xAccessor: xField }
  },
}
