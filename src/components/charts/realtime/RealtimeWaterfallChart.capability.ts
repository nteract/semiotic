import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasNumericValue,
  hasTimeField,
  pickTimeField,
  pickValueField,
  streamThroughputBand,
} from "../../ai/streamSchema"

export const RealtimeWaterfallChartCapability: StreamChartCapability = {
  component: "RealtimeWaterfallChart",
  family: "realtime",
  importPath: "semiotic/realtime",
  requiresLiveData: true,
  rubric: { familiarity: 2, accuracy: 4, precision: 3 },

  fits: (schema) => {
    if (!hasTimeField(schema)) {
      return "needs a time field"
    }
    if (!hasNumericValue(schema)) {
      return "needs a numeric value field"
    }
    return null
  },

  intentScores: {
    "change-detection": 5,
    "trend": 3,
    "outlier-detection": 4,
    "distribution": (schema) => (streamThroughputBand(schema) === "high" ? 4 : 2),
  },

  buildProps: (schema) => ({
    timeAccessor: pickTimeField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
  }),
}
