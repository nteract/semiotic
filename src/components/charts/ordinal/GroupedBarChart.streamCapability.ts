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
  streamCategorySumPolicy(schema, "GroupedBarChart", [
    pickCategoryField(schema)?.name,
    pickSeriesField(schema)?.name,
  ])

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
    return sumPolicy(schema).exclude ?? null
  },

  intentScores: {
    "compare-categories": (schema) => 5 * sumPolicy(schema).factor,
    "compare-series": (schema) => 4 * sumPolicy(schema).factor,
    "rank": (schema) => 3 * sumPolicy(schema).factor,
  },

  caveats: (schema) => [
    ...sumPolicy(schema).caveats,
    ...streamKeyedChangelogCaveat(schema, "frameProps.dataIdAccessor"),
  ],

  buildProps: (schema) => ({
    categoryAccessor: pickCategoryField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
    groupBy: pickSeriesField(schema)?.name,
    colorBy: pickSeriesField(schema)?.name,
  }),
}
