import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const FlowMapCapability: ChartCapability = {
  component: "FlowMap",
  family: "geo",
  importPath: "semiotic/geo",
  rubric: { familiarity: 2, accuracy: 3, precision: 2 },

  fits: (profile) => {
    if (!profile.hasGeo || !profile.geo) return "needs a geo dataset"
    if (!(profile.geo.flows?.length)) return "needs flow records (source/target/value)"
    if (!(profile.geo.points?.length)) return "needs point nodes with lat/lon"
    return null
  },

  intentScores: { "geo": 4, "flow": 5 },

  buildProps: (profile) => ({
    flows: profile.geo?.flows ?? [],
    nodes: profile.geo?.points ?? [],
    valueAccessor: "value",
  }),
}
