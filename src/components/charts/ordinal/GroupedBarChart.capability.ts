import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const GroupedBarChartCapability: ChartCapability = {
  component: "GroupedBarChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 4, accuracy: 5, precision: 4 },

  fits: (profile) => {
    if (!profile.primary.category) return "needs a category field"
    if (!profile.primary.y) return "needs a numeric value field"
    if (!profile.primary.series) return "needs a series field to group by"
    if ((profile.seriesCount ?? 0) < 2) return "needs 2+ groups"
    if ((profile.seriesCount ?? 0) > 6) return `${profile.seriesCount} groups is too many for grouped bars`
    if ((profile.categoryCount ?? 0) > 25) return "too many categories for grouped bars"
    return null
  },

  intentScores: {
    "compare-categories": 5,
    "compare-series": 4,
    "rank": 3,
  },

  buildProps: (profile) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
    groupBy: profile.primary.series,
    colorBy: profile.primary.series,
  }),
}
