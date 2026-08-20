import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const WaterfallChartCapability: ChartCapability = {
  component: "WaterfallChart",
  family: "flow",
  importPath: "semiotic/xy",
  rubric: { familiarity: 4, accuracy: 4, precision: 4 },

  fits: (profile) => {
    if (!profile.primary.y) return "needs a numeric delta field"
    if (profile.rowCount < 3) return "needs a sequence of steps"
    return null
  },

  intentScores: {
    "flow": 5,
    "trend": 2,
    "compare-categories": 2,
  },

  caveats: () => [
    "each row is a signed delta, not a running total — pre-summed levels will double-count",
  ],

  buildProps: (profile) => ({
    data: profile.data,
    xAccessor: profile.primary.x ?? profile.primary.category,
    yAccessor: profile.primary.y,
  }),
}
