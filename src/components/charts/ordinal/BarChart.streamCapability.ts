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
  streamCategorySumPolicy(schema, "BarChart", [pickCategoryField(schema)?.name])

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
    return sumPolicy(schema).exclude ?? null
  },

  intentScores: {
    "compare-categories": (schema) => 5 * sumPolicy(schema).factor,
    "rank": (schema) => 5 * sumPolicy(schema).factor,
    "part-to-whole": (schema) => 3 * sumPolicy(schema).factor,
  },

  caveats: (schema) => {
    const out = [
      ...sumPolicy(schema).caveats,
      ...streamKeyedChangelogCaveat(schema, "frameProps.dataIdAccessor"),
    ]
    const category = pickCategoryField(schema)
    const bars = streamFieldCardinality(category)
    if (category && bars !== undefined && bars > 30) {
      out.push(`"${category.name}" has ~${bars} values — show the top categories rather than ${bars} bars`)
    }
    return out
  },

  buildProps: (schema) => ({
    categoryAccessor: pickCategoryField(schema)?.name,
    valueAccessor: pickValueField(schema)?.name,
  }),
}
