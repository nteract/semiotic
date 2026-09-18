import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasCategoryField,
  hasNumericValue,
  pickCategoryField,
  pickValueField,
  resolveStreamShape,
} from "../../ai/streamSchema"

export const BarChartStreamCapability: StreamChartCapability = {
  component: "BarChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  requiresLiveData: true,
  rubric: { familiarity: 5, accuracy: 5, precision: 4 },

  fits: (schema) => {
    if (resolveStreamShape(schema) === "aggregate") {
      return "BarChart compares categories — use BigNumber or GaugeChart for a single-row aggregate"
    }
    if (!hasCategoryField(schema)) return "needs a category field"
    if (!hasNumericValue(schema)) return "needs a numeric value field"
    return null
  },

  intentScores: {
    "compare-categories": 5,
    "rank": 5,
    "part-to-whole": 3,
  },

  buildProps: (schema) => ({
    categoryAccessor: pickCategoryField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
  }),
}
