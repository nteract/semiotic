import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const RadarChartCapability: ChartCapability = {
  component: "RadarChart",
  family: "relationship",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 4, accuracy: 3, precision: 3 },

  fits: (profile) => {
    if (!profile.primary.y) return "needs a numeric value field"
    if (!profile.primary.category) return "needs a category/attribute field"
    const categoryCount = profile.categoryCount ?? 0
    if (categoryCount < 3) return "needs at least 3 axes (attributes)"
    if (categoryCount > 12) return "too many axes for a readable radar"
    return null
  },

  intentScores: {
    "compare-categories": 3,
    "rank": 2,
    "part-to-whole": 1,
  },

  caveats: () => [
    "radar charts imply a closed cycle among axes — only use when the attributes are comparable magnitudes",
  ],

  buildProps: (profile) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
    ...(profile.primary.series ? { seriesAccessor: profile.primary.series, colorBy: profile.primary.series } : {}),
  }),
}
