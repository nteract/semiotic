import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const BoxPlotCapability: ChartCapability = {
  component: "BoxPlot",
  family: "distribution",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 4, accuracy: 4, precision: 3 },

  fits: (profile) => {
    if (!profile.primary.y) return "needs a numeric field"
    if (!profile.primary.category) return "needs a category to split distributions"
    // We need repeated rows per category — otherwise there's no distribution per box.
    if (profile.rowCount / Math.max(profile.categoryCount ?? 1, 1) < 3) {
      return "needs 3+ observations per category"
    }
    return null
  },

  intentScores: {
    "distribution": 5,
    "compare-categories": 4,
    "outlier-detection": 4,
  },

  buildProps: (profile) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
  }),
}
