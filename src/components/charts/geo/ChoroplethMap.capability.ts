import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const ChoroplethMapCapability: ChartCapability = {
  component: "ChoroplethMap",
  family: "geo",
  importPath: "semiotic/geo",
  rubric: { familiarity: 4, accuracy: 3, precision: 2 },

  fits: (profile) => {
    if (!profile.hasGeo || !profile.geo) return "needs a GeoJSON FeatureCollection via rawInput"
    // A choropleth encodes value-by-area; a single polygon has nothing to
    // compare — point-based geo charts are the honest answer for an
    // outline-plus-points dataset.
    if (profile.geo.features.length < 2) return "needs at least 2 area features to compare"
    return null
  },

  intentScores: { "geo": 5, "compare-categories": 3 },

  caveats: () => ["large areas dominate visual weight regardless of measurement"],

  buildProps: (profile) => ({
    areas: profile.geo?.features ?? [],
    valueAccessor: profile.primary.y ?? "value",
  }),
}
