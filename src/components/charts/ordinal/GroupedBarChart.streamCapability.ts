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

export const GroupedBarChartStreamCapability: StreamChartCapability = {
  component: "GroupedBarChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  requiresLiveData: true,
  rubric: { familiarity: 4, accuracy: 5, precision: 4 },

  fits: (schema) => {
    if (resolveStreamShape(schema) === "aggregate") {
      return "GroupedBarChart needs categories to group — not a single-row aggregate"
    }
    if (!hasCategoryField(schema)) return "needs a category field"
    if (!hasNumericValue(schema)) return "needs a numeric value field"
    if (!hasSeriesField(schema)) return "needs a series field to group by"
    return null
  },

  intentScores: {
    "compare-categories": 5,
    "compare-series": 4,
    "rank": 3,
  },

  buildProps: (schema) => ({
    categoryAccessor: pickCategoryField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
    groupBy: pickSeriesField(schema)?.name,
    colorBy: pickSeriesField(schema)?.name,
  }),
}
