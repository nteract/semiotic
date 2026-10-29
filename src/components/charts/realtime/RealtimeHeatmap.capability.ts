import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasNumericValue,
  hasTimeField,
  pickTimeField,
  pickValueField,
  streamBufferProps,
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

  // Time × value bins coloured by event count: how the measure's values are
  // spread, and how that spread moves.
  intentScores: {
    "trend": (schema) => (streamThroughputBand(schema) === "high" ? 4 : 2),
    "distribution": 4,
    "change-detection": 3,
    // Bins pool every event, so series are not separated.
    "compare-series": 1,
  },

  reasons: (schema) => {
    const { windowSize } = streamBufferProps(schema, 20000)
    return windowSize ? [`windowSize ${windowSize} keeps recent history visible at this event rate`] : []
  },

  buildProps: (schema) => ({
    timeAccessor: pickTimeField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
    ...streamBufferProps(schema, 20000),
  }),
}
