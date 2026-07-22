import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../../data/numericContracts"

export const ProportionalSymbolMapCapability: ChartCapability = {
  component: "ProportionalSymbolMap",
  family: "geo",
  importPath: "semiotic/geo",
  numericContracts: BUILT_IN_NUMERIC_CONTRACTS.ProportionalSymbolMap,
  rubric: { familiarity: 3, accuracy: 3, precision: 3 },

  fits: (profile) => {
    if (!profile.hasGeo || !profile.geo) return "needs a GeoJSON FeatureCollection (with points or area centroids)"
    const havePoints = (profile.geo.points?.length ?? 0) > 0
    if (!havePoints && (profile.geo.features.length ?? 0) === 0) return "needs points or area features"
    return null
  },

  intentScores: { "geo": 4, "rank": 3, "compare-categories": 3 },

  buildProps: (profile) => ({
    points: profile.geo?.points ?? [],
    areas: profile.geo?.features ?? undefined,
    xAccessor: "lon",
    yAccessor: "lat",
    sizeBy: profile.primary.size ?? "value",
  }),
}
