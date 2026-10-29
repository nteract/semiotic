import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasCategoryField,
  hasNumericValue,
  hasTimeField,
  pickCategoryField,
  pickTimeField,
  pickValueField,
  streamBufferProps,
  streamFieldCardinality,
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
    if (streamThroughputBand(schema) === "high") {
      return "draws every event as a dot — for high-throughput streams, prefer RealtimeHeatmap, or RealtimeLineChart with aggregate"
    }
    return null
  },

  intentScores: {
    "outlier-detection": 5,
    "distribution": 4,
    "compare-categories": 3,
  },

  reasons: (schema) => {
    const { windowSize } = streamBufferProps(schema, 5000)
    return windowSize ? [`windowSize ${windowSize} keeps recent history visible at this event rate`] : []
  },

  caveats: (schema) => {
    const category = pickCategoryField(schema)
    const count = streamFieldCardinality(category)
    return category && count !== undefined && count > 10
      ? [`"${category.name}" has ~${count} values; colours repeat once the categorical palette runs out — group rare values or pick a coarser category`]
      : []
  },

  buildProps: (schema) => ({
    timeAccessor: pickTimeField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
    categoryAccessor: pickCategoryField(schema)?.name,
    ...streamBufferProps(schema, 5000),
  }),
}
