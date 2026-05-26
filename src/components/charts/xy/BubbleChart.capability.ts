import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const BubbleChartCapability: ChartCapability = {
  component: "BubbleChart",
  family: "relationship",
  importPath: "semiotic/xy",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 points"
    if (!profile.primary.x) return "needs a numeric x field"
    if (!profile.primary.y) return "needs a numeric y field"
    if (!profile.primary.size) return "needs a third numeric measure for bubble size"
    return null
  },

  intentScores: {
    "correlation": 4,
    "compare-categories": 3,
    "outlier-detection": 4,
  },

  caveats: () => ["bubble area is harder to compare than length — large dynamic ranges distort"],

  buildProps: (profile) => ({
    data: profile.data,
    xAccessor: profile.primary.x,
    yAccessor: profile.primary.y,
    sizeBy: profile.primary.size,
    ...(profile.primary.series && (profile.seriesCount ?? 0) <= 6 ? { colorBy: profile.primary.series } : {}),
  }),
}
