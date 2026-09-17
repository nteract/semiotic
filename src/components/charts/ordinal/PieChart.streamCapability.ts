import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasCategoryField,
  hasNumericValue,
  pickCategoryField,
  pickValueField,
  resolveStreamShape,
} from "../../ai/streamSchema"

export const PieChartStreamCapability: StreamChartCapability = {
  component: "PieChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  requiresLiveData: true,
  rubric: { familiarity: 5, accuracy: 3, precision: 2 },

  fits: (schema) => {
    if (resolveStreamShape(schema) === "aggregate") {
      return "PieChart needs categories to slice — use GaugeChart for a single value"
    }
    if (!hasCategoryField(schema)) return "needs a category field"
    if (!hasNumericValue(schema)) return "needs a numeric value field"
    return null
  },

  intentScores: {
    "part-to-whole": 4,
    "compare-categories": 2,
    "rank": 1,
  },

  caveats: () => [
    "stream cardinality is unknown — pies with more than ~8 slices become hard to read",
    "angle comparisons are less accurate than length — prefer a bar chart unless part-to-whole is the explicit message",
  ],

  buildProps: (schema) => ({
    categoryAccessor: pickCategoryField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
  }),
}
