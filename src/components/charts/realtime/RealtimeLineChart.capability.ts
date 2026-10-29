import type { StreamChartCapability, StreamSchema } from "../../ai/streamingTypes"
import {
  hasNumericValue,
  hasTimeField,
  pickSplitField,
  pickTimeField,
  pickValueField,
  streamBufferProps,
  streamFieldCardinality,
  streamMeasureAdditivity,
  streamThroughputBand,
  streamKeyedChangelogCaveat,
} from "../../ai/streamSchema"

const AGGREGATE_WINDOW = "1s"

// A raw line redraws every event; above ~100 rows/s it switches to
// windowed aggregation so render cost tracks windows, not events.
function aggregates(schema: StreamSchema): boolean {
  return streamThroughputBand(schema) === "high"
}

function aggregateStat(schema: StreamSchema): "sum" | "mean" {
  return streamMeasureAdditivity(pickValueField(schema)) === true ? "sum" : "mean"
}

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
    return null
  },

  intentScores: {
    "trend": 5,
    "change-detection": 4,
    "compare-series": (schema) => (pickSplitField(schema) ? 4 : 1),
    // Window means smooth away the individual events outliers live in.
    "outlier-detection": (schema) => (aggregates(schema) ? 1 : 2),
  },

  reasons: (schema) => {
    if (aggregates(schema)) {
      return [
        `aggregates events into ${AGGREGATE_WINDOW} windows (${aggregateStat(schema)}) so render cost stays bounded at high throughput`,
      ]
    }
    const { windowSize } = streamBufferProps(schema, 5000)
    return windowSize ? [`windowSize ${windowSize} keeps recent history visible at this event rate`] : []
  },

  caveats: (schema) => {
    const out: string[] = []
    if (schema.retention === "cumulative" && !aggregates(schema)) {
      out.push("growing retention keeps every event up to maxCapacity (100,000 by default) — use aggregate for long-running streams")
    }
    const split = pickSplitField(schema)
    const lines = streamFieldCardinality(split)
    if (split && lines !== undefined && lines > 10) {
      out.push(`"${split.name}" has ~${lines} values, so ~${lines} lines will overlap — filter to the top series or use RealtimeHeatmap`)
    }
    if (aggregates(schema) && pickTimeField(schema)?.kind === "numeric") {
      out.push(`aggregate.size assumes "${pickTimeField(schema)?.name}" is in milliseconds`)
    }
    if (!aggregates(schema)) out.push(...streamKeyedChangelogCaveat(schema, "pointIdAccessor"))
    return out
  },

  buildProps: (schema) => {
    const splitField = pickSplitField(schema)
    return {
      timeAccessor: pickTimeField(schema)?.name,
      valueAccessor: pickValueField(schema)?.name,
      ...(splitField ? { seriesAccessor: splitField.name } : {}),
      ...(aggregates(schema)
        ? { aggregate: { size: AGGREGATE_WINDOW, stat: aggregateStat(schema) } }
        : streamBufferProps(schema, 5000)),
    }
  },
}
