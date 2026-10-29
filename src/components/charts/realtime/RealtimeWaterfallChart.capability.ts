import type { StreamChartCapability, StreamSchema } from "../../ai/streamingTypes"
import {
  hasNumericValue,
  hasTimeField,
  isDeltaLikeFieldName,
  pickTimeField,
  pickValueField,
  streamBufferProps,
  streamThroughputBand,
} from "../../ai/streamSchema"

// The waterfall adds each event to a running baseline, so it only reads
// correctly when the measure is a signed change.
function confirmedChange(schema: StreamSchema): boolean {
  const value = pickValueField(schema)
  return value?.additive === true || (value !== undefined && isDeltaLikeFieldName(value.name))
}

function changeFactor(schema: StreamSchema): number {
  return confirmedChange(schema) ? 1 : 0.5
}

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
    const value = pickValueField(schema)
    if (value?.additive === false) {
      return `accumulates each value as a change from a running baseline, but "${value.name}" is marked non-additive`
    }
    if (streamThroughputBand(schema) === "high") {
      return "draws one bar per event — for high-throughput streams, prefer RealtimeHistogram or RealtimeHeatmap"
    }
    return null
  },

  intentScores: {
    "change-detection": (schema) => 5 * changeFactor(schema),
    "trend": (schema) => 3 * changeFactor(schema),
    "outlier-detection": (schema) => 4 * changeFactor(schema),
    "distribution": (schema) => 2 * changeFactor(schema),
  },

  caveats: (schema) => {
    const value = pickValueField(schema)
    return value && !confirmedChange(schema)
      ? [`accumulates each "${value.name}" as a change from a running baseline — only meaningful if "${value.name}" is a signed change; set additive: true to confirm, or false to rule this chart out`]
      : []
  },

  buildProps: (schema) => ({
    timeAccessor: pickTimeField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
    ...streamBufferProps(schema, 5000),
  }),
}
