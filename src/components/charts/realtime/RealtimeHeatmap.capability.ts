import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasNumericValue,
  hasTimeField,
  pickCategoryField,
  pickSeriesField,
  pickTimeField,
  pickValueField,
  streamThroughputBand,
} from "../../ai/streamSchema"

export const RealtimeHeatmapCapability: StreamChartCapability = {
  component: "RealtimeHeatmap",
  family: "realtime",
  importPath: "semiotic/realtime",
  requiresLiveData: true,
  rubric: { familiarity: 2, accuracy: 3, precision: 2 },

  fits: (schema) => {
    if (!hasTimeField(schema)) {
      return "needs a time field for the x axis"
    }
    if (!hasNumericValue(schema)) {
      return "needs a numeric value field"
    }
    return null
  },

  intentScores: {
    "trend": (schema) => (streamThroughputBand(schema) === "high" ? 4 : 2),
    "distribution": 3,
    "change-detection": 3,
    "compare-series": (schema) => (pickSeriesField(schema) ? 4 : 1),
  },

  buildProps: (schema) => {
    const categoryField = pickCategoryField(schema)
    return {
      timeAccessor: pickTimeField(schema)?.name,
      valueAccessor: pickValueField(schema)?.name,
      ...(categoryField ? { categoryAccessor: categoryField.name } : {}),
    }
  },
}
