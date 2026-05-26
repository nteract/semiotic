import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const SwarmPlotCapability: ChartCapability = {
  component: "SwarmPlot",
  family: "distribution",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 3, accuracy: 4, precision: 4 },

  fits: (profile) => {
    if (!profile.primary.y) return "needs a numeric field"
    if (!profile.primary.category) return "needs a category"
    if (profile.rowCount / Math.max(profile.categoryCount ?? 1, 1) < 4) return "needs 4+ observations per category"
    if (profile.rowCount > 2000) return "too many points for a swarm — consider a violin or box"
    return null
  },

  intentScores: {
    "distribution": 4,
    "outlier-detection": 5,
    "compare-categories": 3,
  },

  buildProps: (profile) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
    ...(profile.primary.series && profile.primary.series !== profile.primary.category ? { colorBy: profile.primary.series } : {}),
  }),
}
