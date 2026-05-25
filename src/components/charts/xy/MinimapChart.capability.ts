import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const MinimapChartCapability: ChartCapability = {
  component: "MinimapChart",
  family: "time-series",
  importPath: "semiotic/xy",
  rubric: { familiarity: 4, accuracy: 4, precision: 4 },

  fits: (profile) => {
    if (profile.rowCount < 30) return "minimap pays off only on long sequences (30+ rows)"
    if (!profile.primary.x) return "needs an ordered x field"
    if (!profile.primary.y) return "needs a numeric y field"
    if (profile.xProvenance === "scatter" && !profile.monotonicX) {
      return "needs an ordered/temporal x — minimap previews a sequence"
    }
    return null
  },

  intentScores: {
    "trend": 4,
    "change-detection": 4,
    "outlier-detection": 3,
  },

  buildProps: (profile) => ({
    data: profile.data,
    xAccessor: profile.primary.x,
    yAccessor: profile.primary.y,
    ...(profile.hasTimeAxis && profile.primary.x === profile.primary.time ? { xScaleType: "time" } : {}),
  }),
}
