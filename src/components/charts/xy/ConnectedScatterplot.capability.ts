import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const ConnectedScatterplotCapability: ChartCapability = {
  component: "ConnectedScatterplot",
  family: "relationship",
  importPath: "semiotic/xy",
  rubric: { familiarity: 3, accuracy: 4, precision: 4 },

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 ordered points"
    if (!profile.primary.x) return "needs an x field"
    if (!profile.primary.y) return "needs a y field"
    if (!profile.monotonicX && !profile.hasTimeAxis) return "needs an ordered x sequence"
    return null
  },

  intentScores: {
    "trend": 3,
    "correlation": 4,
    "change-detection": 3,
  },

  caveats: () => ["readers can confuse path direction without explicit start/end markers"],

  buildProps: (profile) => ({
    data: profile.data,
    xAccessor: profile.primary.x,
    yAccessor: profile.primary.y,
    orderAccessor: profile.primary.time ?? profile.primary.x,
    ...(profile.primary.series && (profile.seriesCount ?? 0) <= 6 ? { colorBy: profile.primary.series } : {}),
  }),
}
