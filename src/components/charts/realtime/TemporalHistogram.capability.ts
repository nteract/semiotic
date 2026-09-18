import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasNumericValue,
  hasTimeField,
  pickTimeField,
  pickValueField,
} from "../../ai/streamSchema"

/**
 * TemporalHistogram is the bounded sibling of RealtimeHistogram — same chart
 * but for static data with a fixed window. For stream selection it competes
 * with RealtimeHistogram; the choice depends on retention.
 */
export const TemporalHistogramCapability: StreamChartCapability = {
  component: "TemporalHistogram",
  family: "realtime",
  importPath: "semiotic/realtime",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },

  fits: (schema) => {
    if (!hasTimeField(schema)) {
      return "needs a time field"
    }
    if (!hasNumericValue(schema)) {
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

  buildProps: (schema) => ({
    timeAccessor: pickTimeField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
  }),
}
