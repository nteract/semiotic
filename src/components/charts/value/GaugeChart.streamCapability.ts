import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasCategoryField,
  hasNumericValue,
  hasTimeField,
  pickValueField,
  resolveStreamShape,
} from "../../ai/streamSchema"

export const GaugeChartStreamCapability: StreamChartCapability = {
  component: "GaugeChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  requiresLiveData: false,
  rubric: { familiarity: 4, accuracy: 2, precision: 2 },

  fits: (schema) => {
    if (!hasNumericValue(schema)) return "needs a numeric value"
    const shape = resolveStreamShape(schema)
    if (shape === "aggregate") return null
    if (!hasCategoryField(schema) && !hasTimeField(schema)) return null
    return "GaugeChart shows a single value — provide a single-row aggregate or use BarChart"
  },

  intentScores: {
    "part-to-whole": (schema) => (resolveStreamShape(schema) === "aggregate" ? 5 : 1),
    "compare-categories": 1,
    "rank": 1,
  },

  caveats: () => [
    "gauges only show a single value; consider a stat card or bar instead for comparison",
  ],

  buildProps: (schema) => {
    const valueField = pickValueField(schema)
    return {
      value: 0,
      min: 0,
      max: 100,
      label: valueField?.name,
    }
  },
}
