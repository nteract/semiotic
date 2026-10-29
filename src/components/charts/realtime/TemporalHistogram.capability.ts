import type { StreamChartCapability } from "../../ai/streamingTypes"
import { pickTimeField, pickValueField } from "../../ai/streamSchema"

/**
 * TemporalHistogram is the bounded sibling of RealtimeHistogram: same chart,
 * but it takes a static `data` array and has no push API. A stream — even
 * one with cumulative retention — belongs to RealtimeHistogram (which
 * suggests `windowMode: "growing"` for cumulative retention), so this
 * descriptor stays registered only to explain the redirect.
 */
export const TemporalHistogramCapability: StreamChartCapability = {
  component: "TemporalHistogram",
  family: "realtime",
  importPath: "semiotic/realtime",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },

  fits: () =>
    "renders a bounded data array without a push API — use RealtimeHistogram for a stream (cumulative retention maps to windowMode \"growing\")",

  intentScores: {
    "distribution": 2,
    "change-detection": 3,
    "trend": 3,
  },

  buildProps: (schema) => ({
    timeAccessor: pickTimeField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
  }),
}
