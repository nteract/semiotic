import type { StreamChartCapability, StreamSchema } from "../../ai/streamingTypes"
import {
  hasCategoryField,
  hasNumericValue,
  hasSeriesField,
  pickCategoryField,
  pickSeriesField,
  pickValueField,
  resolveStreamShape,
  streamCategorySumPolicy,
  streamKeyedChangelogCaveat,
} from "../../ai/streamSchema"

const sumPolicy = (schema: StreamSchema) =>
  streamCategorySumPolicy(schema, "StackedBarChart", [
    pickCategoryField(schema)?.name,
    pickSeriesField(schema)?.name,
  ])

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
    return sumPolicy(schema).exclude ?? null
  },

  intentScores: {
    "part-to-whole": (schema) => 4 * sumPolicy(schema).factor,
    "compare-categories": (schema) => 4 * sumPolicy(schema).factor,
    "compare-series": (schema) => 2 * sumPolicy(schema).factor,
  },

  caveats: (schema) => [
    "only the bottom segment shares a baseline; others are harder to compare across categories",
    ...sumPolicy(schema).caveats,
    ...streamKeyedChangelogCaveat(schema, "frameProps.dataIdAccessor"),
  ],

  buildProps: (schema) => ({
    categoryAccessor: pickCategoryField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
    stackBy: pickSeriesField(schema)?.name,
    colorBy: pickSeriesField(schema)?.name,
  }),
}
