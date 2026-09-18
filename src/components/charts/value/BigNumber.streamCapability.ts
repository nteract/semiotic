import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasCategoryField,
  hasNumericValue,
  hasTimeField,
  pickValueField,
  resolveStreamShape,
} from "../../ai/streamSchema"

export const BigNumberStreamCapability: StreamChartCapability = {
  component: "BigNumber",
  family: "value",
  importPath: "semiotic/value",
  requiresLiveData: true,
  rubric: { familiarity: 5, accuracy: 5, precision: 5 },

  fits: (schema) => {
    if (!hasNumericValue(schema)) return "needs a numeric value to display"
    const shape = resolveStreamShape(schema)
    if (shape === "aggregate") return null
    if (!hasCategoryField(schema) && !hasTimeField(schema)) return null
    return "BigNumber shows a single focal value — use a chart family when the stream has categories or time"
  },

  intentScores: {
    "part-to-whole": (schema) => (resolveStreamShape(schema) === "aggregate" ? 5 : 1),
    "change-detection": (schema) => (hasTimeField(schema) ? 3 : 1),
    "trend": (schema) => (hasTimeField(schema) ? 2 : 0),
  },

  caveats: (schema) =>
    hasTimeField(schema)
      ? ["BigNumber renders the latest value as the focal number; pair a sparkline if you need the trend"]
      : [],

  buildProps: (schema) => {
    const valueField = pickValueField(schema)
    return {
      value: 0,
      label: valueField?.name,
    }
  },
}
