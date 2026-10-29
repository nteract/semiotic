import type { StreamChartCapability, StreamSchema } from "../../ai/streamingTypes"
import {
  hasNumericValue,
  isSingleValueStream,
  pickValueField,
  resolveStreamShape,
  streamKeyFields,
} from "../../ai/streamSchema"

// A gauge is only honest on a known scale; names are the only evidence a
// schema carries about one.
function knownRange(schema: StreamSchema): [number, number] | undefined {
  const name = pickValueField(schema)?.name.toLowerCase() ?? ""
  if (/(^|[^a-z])(pct|percent|percentage)([^a-z]|$)|pct$|percent$/.test(name)) return [0, 100]
  if (/(^|[^a-z])(ratio|fraction)([^a-z]|$)/.test(name)) return [0, 1]
  return undefined
}

export const GaugeChartStreamCapability: StreamChartCapability = {
  component: "GaugeChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  requiresLiveData: false,
  rubric: { familiarity: 4, accuracy: 2, precision: 2 },

  fits: (schema) => {
    if (!hasNumericValue(schema)) return "needs a numeric value"
    if (isSingleValueStream(schema)) return null
    if (resolveStreamShape(schema) === "keyed" && streamKeyFields(schema).length > 0) {
      return "a keyed table has one row per key — declare shape \"aggregate\" for a single-row result, or use BarChart"
    }
    return "GaugeChart shows a single value — provide a single-row aggregate or use BarChart"
  },

  intentScores: {
    "part-to-whole": (schema) => (knownRange(schema) ? 5 : 2.5),
    "compare-categories": 1,
    "rank": 1,
  },

  reasons: (schema) => {
    const range = knownRange(schema)
    return range ? [`${range[0]}–${range[1]} scale inferred from "${pickValueField(schema)?.name}"`] : []
  },

  caveats: (schema) => {
    const field = pickValueField(schema)?.name
    return [
      "gauges only show a single value; consider a stat card or bar instead for comparison",
      ...(knownRange(schema)
        ? []
        : [`the range of "${field}" is unknown — set min and max (the gauge defaults to 0–100)`]),
    ]
  },

  buildProps: (schema) => {
    const valueField = pickValueField(schema)
    const range = knownRange(schema)
    return {
      value: 0,
      ...(range ? { min: range[0], max: range[1] } : {}),
      label: valueField?.name,
    }
  },
}
