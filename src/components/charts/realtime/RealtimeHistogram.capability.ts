import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasNumericValue,
  hasTimeField,
  pickTimeField,
  pickValueField,
} from "../../ai/streamSchema"

export const RealtimeHistogramCapability: StreamChartCapability = {
  component: "RealtimeHistogram",
  family: "realtime",
  importPath: "semiotic/realtime",
  requiresLiveData: true,
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },

  fits: (schema) => {
    if (!hasTimeField(schema)) {
      return "needs a time field"
    }
    if (!hasNumericValue(schema)) {
      return "needs a numeric field to bin"
    }
    return null
  },

  intentScores: {
    "distribution": 5,
    "outlier-detection": 4,
    "change-detection": 2,
  },

  buildProps: (schema) => ({
    timeAccessor: pickTimeField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
  }),
}
