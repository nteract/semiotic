import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const ChoroplethMapCapability: ChartCapability = {
  component: "ChoroplethMap",
  family: "geo",
  importPath: "semiotic/geo",
  rubric: { familiarity: 4, accuracy: 3, precision: 2 },

  fits: (profile) => {
    if (!profile.hasGeo || !profile.geo) return "needs a GeoJSON FeatureCollection via rawInput"
    if (profile.geo.features.length < 1) return "needs at least 1 area feature"
    return null
  },

  intentScores: { "geo": 5, "compare-categories": 3 },

  caveats: () => ["large areas dominate visual weight regardless of measurement"],

  buildProps: (profile) => ({
    areas: profile.geo?.features ?? [],
    valueAccessor: profile.primary.y ?? "value",
  }),
}
