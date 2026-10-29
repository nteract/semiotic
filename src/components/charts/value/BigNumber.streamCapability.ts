import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasNumericValue,
  hasTimeField,
  isSingleValueStream,
  pickValueField,
  resolveStreamShape,
  streamKeyFields,
} from "../../ai/streamSchema"

export const BigNumberStreamCapability: StreamChartCapability = {
  component: "BigNumber",
  family: "value",
  importPath: "semiotic/value",
  requiresLiveData: true,
  rubric: { familiarity: 5, accuracy: 5, precision: 5 },

  fits: (schema) => {
    if (!hasNumericValue(schema)) return "needs a numeric value to display"
    if (isSingleValueStream(schema)) return null
    if (resolveStreamShape(schema) === "keyed" && streamKeyFields(schema).length > 0) {
      return "a keyed table has one row per key — declare shape \"aggregate\" for a single-row result, or plot the key with role \"category\""
    }
    return "BigNumber shows a single focal value — use a chart family when the stream has categories or time"
  },

  intentScores: {
    "part-to-whole": 5,
    "change-detection": (schema) => (hasTimeField(schema) ? 3 : 1),
    "trend": (schema) => (hasTimeField(schema) ? 2 : 0),
  },

  caveats: (schema) => {
    const field = pickValueField(schema)?.name
    const out = [
      `value: 0 is a placeholder until the first event — push { value: row.${field} } through the ref`,
    ]
    if (resolveStreamShape(schema) !== "aggregate") {
      out.push(`an append stream with no time or category: the number is the latest event's "${field}", not a total — declare shape "aggregate" if each event is a running aggregate`)
    }
    if (hasTimeField(schema)) {
      out.push("BigNumber renders the latest value as the focal number; pair a sparkline if you need the trend")
    }
    return out
  },

  buildProps: (schema) => {
    const valueField = pickValueField(schema)
    return {
      value: 0,
      label: valueField?.name,
    }
  },
}
