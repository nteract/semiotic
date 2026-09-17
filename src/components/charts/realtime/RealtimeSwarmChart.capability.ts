import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasCategoryField,
  hasNumericValue,
  hasTimeField,
  pickCategoryField,
  pickTimeField,
  pickValueField,
  streamThroughputBand,
} from "../../ai/streamSchema"

export const RealtimeSwarmChartCapability: StreamChartCapability = {
  component: "RealtimeSwarmChart",
  family: "realtime",
  importPath: "semiotic/realtime",
  requiresLiveData: true,
  rubric: { familiarity: 2, accuracy: 4, precision: 4 },

  fits: (schema) => {
    if (!hasTimeField(schema)) {
      return "needs a time field (points are placed at (time, value))"
    }
    if (!hasNumericValue(schema)) {
      return "needs a numeric field"
    }
    if (!hasCategoryField(schema)) {
      return "needs a category to swarm by"
    }
    return null
  },

  intentScores: {
    "outlier-detection": 5,
    "distribution": 4,
    "compare-categories": 3,
  },

  caveats: (schema) =>
    streamThroughputBand(schema) === "high"
      ? ["high-throughput swarms get crowded — consider RealtimeHistogram"]
      : [],

  buildProps: (schema) => ({
    timeAccessor: pickTimeField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
    categoryAccessor: pickCategoryField(schema)?.name,
  }),
}
