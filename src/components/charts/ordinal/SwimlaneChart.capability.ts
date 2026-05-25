import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const SwimlaneChartCapability: ChartCapability = {
  component: "SwimlaneChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 3, accuracy: 4, precision: 4 },

  fits: (profile) => {
    if (!profile.primary.category) return "needs a category field"
    if (!profile.primary.series) return "needs a sub-category (lane) field"
    if (!profile.primary.y) return "needs a numeric value field"
    if ((profile.categoryCount ?? 0) < 2) return "needs 2+ categories"
    return null
  },

  intentScores: {
    "compare-categories": 4,
    "composition-over-time": (p) => (p.hasTimeAxis ? 3 : 1),
    "compare-series": 3,
  },

  buildProps: (profile) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    subcategoryAccessor: profile.primary.series,
    valueAccessor: profile.primary.y,
    colorBy: profile.primary.series,
  }),
}
