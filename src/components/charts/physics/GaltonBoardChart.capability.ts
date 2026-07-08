import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const GaltonBoardChartCapability: ChartCapability = {
  component: "GaltonBoardChart",
  family: "distribution",
  importPath: "semiotic/physics",
  rubric: { familiarity: 3, accuracy: 3, precision: 2 },

  fits: (profile) => {
    if (profile.rowCount < 20) return "Galton boards need enough observations for a distribution to form"
    if (!profile.primary.y) return "needs a numeric field to drop into bins"
    return null
  },

  intentScores: {
    distribution: 4,
    "outlier-detection": 1,
  },

  caveats: () => [
    "The settled projection is the chart; motion is explanatory context and should not be used for exact value reading",
  ],

  buildProps: (profile) => ({
    data: profile.data,
    valueAccessor: profile.primary.y,
    bins: Math.max(8, Math.min(24, Math.round(Math.sqrt(profile.rowCount)))),
  }),
}
