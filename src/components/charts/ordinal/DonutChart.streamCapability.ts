import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasCategoryField,
  hasNumericValue,
  pickCategoryField,
  pickValueField,
  resolveStreamShape,
} from "../../ai/streamSchema"

export const DonutChartStreamCapability: StreamChartCapability = {
  component: "DonutChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  requiresLiveData: true,
  rubric: { familiarity: 4, accuracy: 3, precision: 2 },

  fits: (schema) => {
    if (resolveStreamShape(schema) === "aggregate") {
      return "DonutChart needs categories to slice — use GaugeChart for a single value"
    }
    if (!hasCategoryField(schema)) return "needs a category field"
    if (!hasNumericValue(schema)) return "needs a numeric value field"
    return null
  },

  intentScores: {
    "part-to-whole": 4,
    "compare-categories": 2,
  },

  caveats: () => [
    "stream cardinality is unknown — donuts with more than ~8 slices become hard to read",
  ],

  buildProps: (schema) => ({
    categoryAccessor: pickCategoryField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
    innerRadius: 40,
  }),
}
