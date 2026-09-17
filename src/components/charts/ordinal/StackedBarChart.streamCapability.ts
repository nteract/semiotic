import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  hasCategoryField,
  hasNumericValue,
  hasSeriesField,
  pickCategoryField,
  pickSeriesField,
  pickValueField,
  resolveStreamShape,
} from "../../ai/streamSchema"

export const StackedBarChartStreamCapability: StreamChartCapability = {
  component: "StackedBarChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  requiresLiveData: true,
  rubric: { familiarity: 4, accuracy: 4, precision: 3 },

  fits: (schema) => {
    if (resolveStreamShape(schema) === "aggregate") {
      return "StackedBarChart needs categories to stack — not a single-row aggregate"
    }
    if (!hasCategoryField(schema)) return "needs a category field"
    if (!hasNumericValue(schema)) return "needs a numeric value field"
    if (!hasSeriesField(schema)) return "needs a series field to stack by"
    return null
  },

  intentScores: {
    "part-to-whole": 4,
    "compare-categories": 4,
    "compare-series": 2,
  },

  caveats: () => [
    "only the bottom segment shares a baseline; others are harder to compare across categories",
  ],

  buildProps: (schema) => ({
    categoryAccessor: pickCategoryField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
    stackBy: pickSeriesField(schema)?.name,
    colorBy: pickSeriesField(schema)?.name,
  }),
}
