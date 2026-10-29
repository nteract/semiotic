import type { StreamChartCapability, StreamSchema } from "../../ai/streamingTypes"
import {
  hasCategoryField,
  hasNumericValue,
  pickCategoryField,
  pickValueField,
  resolveStreamShape,
  streamCategorySumPolicy,
  streamFieldCardinality,
  streamKeyedChangelogCaveat,
} from "../../ai/streamSchema"

const sumPolicy = (schema: StreamSchema) =>
  streamCategorySumPolicy(schema, "DonutChart", [pickCategoryField(schema)?.name])

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
    const slices = streamFieldCardinality(pickCategoryField(schema))
    if (slices !== undefined && slices > 8) return `${slices} slices is too many for a donut chart`
    return sumPolicy(schema).exclude ?? null
  },

  intentScores: {
    "part-to-whole": (schema) => 4 * sumPolicy(schema).factor,
    "compare-categories": (schema) => 2 * sumPolicy(schema).factor,
  },

  caveats: (schema) => {
    const category = pickCategoryField(schema)
    return [
      ...(streamFieldCardinality(category) === undefined
        ? [`cardinality of "${category?.name}" is unknown — donuts with more than ~8 slices become hard to read; declare cardinality on the field to check`]
        : []),
      ...sumPolicy(schema).caveats,
      ...streamKeyedChangelogCaveat(schema, "frameProps.dataIdAccessor"),
    ]
  },

  buildProps: (schema) => ({
    categoryAccessor: pickCategoryField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
    innerRadius: 40,
  }),
}
