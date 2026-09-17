import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasNumericValue,
  hasTimeField,
  pickSeriesField,
  pickTimeField,
  pickValueField,
  streamThroughputBand,
} from "../../ai/streamSchema"

export const RealtimeLineChartCapability: StreamChartCapability = {
  component: "RealtimeLineChart",
  family: "realtime",
  importPath: "semiotic/realtime",
  requiresLiveData: true,
  rubric: { familiarity: 4, accuracy: 4, precision: 3 },

  fits: (schema) => {
    if (!hasTimeField(schema)) {
      return "needs a date/time field for the x axis"
    }
    if (!hasNumericValue(schema)) {
      return "needs a numeric value field"
    }
    if (streamThroughputBand(schema) === "high") {
      return "for high-throughput streams, prefer RealtimeHeatmap or RealtimeWaterfallChart"
    }
    return null
  },

  intentScores: {
    "trend": 5,
    "change-detection": 4,
    "compare-series": (schema) => (pickSeriesField(schema) ? 4 : 1),
    "outlier-detection": 2,
  },

  caveats: (schema) => {
    const out: string[] = []
    if (schema.retention === "cumulative") {
      out.push("cumulative retention will eventually exhaust the buffer — set a windowSize or downsample")
    }
    return out
  },

  buildProps: (schema) => {
    const seriesField = pickSeriesField(schema)
    return {
      timeAccessor: pickTimeField(schema)?.name,
      valueAccessor: pickValueField(schema)?.name,
      ...(seriesField ? { seriesAccessor: seriesField.name } : {}),
    }
  },
}
