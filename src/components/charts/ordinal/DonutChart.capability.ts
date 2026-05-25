import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const DonutChartCapability: ChartCapability = {
  component: "DonutChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 4, accuracy: 3, precision: 2 },

  fits: (profile) => {
    if (!profile.primary.category) return "needs a category field"
    if (!profile.primary.y) return "needs a numeric value field"
    const count = profile.categoryCount ?? 0
    if (count < 2) return "needs 2+ categories"
    if (count > 8) return `${count} slices is too many for a donut`
    return null
  },

  intentScores: {
    "part-to-whole": 4,
    "compare-categories": 2,
  },

  buildProps: (profile) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
    innerRadius: 60,
  }),
}
