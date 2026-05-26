import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const DistanceCartogramCapability: ChartCapability = {
  component: "DistanceCartogram",
  family: "geo",
  importPath: "semiotic/geo",
  rubric: { familiarity: 1, accuracy: 3, precision: 3 },

  fits: (profile) => {
    if (!profile.hasGeo || !profile.geo) return "needs a geo dataset"
    if (!(profile.geo.points?.length)) return "needs point nodes with lat/lon and a cost field"
    return null
  },

  intentScores: { "geo": 3, "rank": 3, "compare-categories": 2 },

  caveats: () => ["non-standard projection — requires explanation for most readers"],

  buildProps: (profile) => ({
    points: profile.geo?.points ?? [],
    costAccessor: "cost",
  }),
}
