import type { StreamChartCapability, StreamSchema } from "../../ai/streamingTypes"
import {
  hasTimeField,
  pickSplitField,
  pickTimeField,
  pickValueField,
  streamBinSize,
  streamBufferProps,
  streamFieldCardinality,
  streamMeasureAdditivity,
  DEFAULT_STREAM_BUFFER,
} from "../../ai/streamSchema"

const BUFFER_CAP = 20000

// RealtimeHistogram bins events by time. Summing a measure per bin only
// means something for additive measures; otherwise count events.
function sums(schema: StreamSchema): boolean {
  return streamMeasureAdditivity(pickValueField(schema)) === true
}

function bufferSize(schema: StreamSchema): number {
  return streamBufferProps(schema, BUFFER_CAP).windowSize ?? DEFAULT_STREAM_BUFFER
}

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
    return null
  },

  // Activity over time: a temporal histogram, not a value distribution.
  intentScores: {
    "trend": 3,
    "change-detection": 3,
    "composition-over-time": (schema) => (pickSplitField(schema) ? 4 : 0),
    "distribution": 2,
  },

  reasons: (schema) => {
    const value = pickValueField(schema)
    const out = [
      sums(schema)
        ? `sums "${value?.name}" per ${streamBinSize(schema, bufferSize(schema))} ms bin`
        : `counts events per ${streamBinSize(schema, bufferSize(schema))} ms bin${value ? ` (set additive: true on "${value.name}" to sum it instead)` : ""}`,
    ]
    const { windowSize } = streamBufferProps(schema, BUFFER_CAP)
    if (windowSize) out.push(`windowSize ${windowSize} keeps recent history visible at this event rate`)
    return out
  },

  caveats: (schema) => {
    const out: string[] = []
    const split = pickSplitField(schema)
    const count = streamFieldCardinality(split)
    if (split && count !== undefined && count > 10) {
      out.push(`"${split.name}" has ~${count} values to stack — group rare values or drop categoryAccessor`)
    }
    if (pickTimeField(schema)?.kind === "numeric") {
      out.push(`binSize assumes "${pickTimeField(schema)?.name}" is in milliseconds`)
    }
    return out
  },

  buildProps: (schema) => {
    const split = pickSplitField(schema)
    return {
      timeAccessor: pickTimeField(schema)?.name,
      ...(sums(schema)
        ? { valueAccessor: pickValueField(schema)?.name }
        : { aggregation: "count" }),
      binSize: streamBinSize(schema, bufferSize(schema)),
      ...(split ? { categoryAccessor: split.name } : {}),
      ...streamBufferProps(schema, BUFFER_CAP),
    }
  },
}
