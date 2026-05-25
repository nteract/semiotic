import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const OrbitDiagramCapability: ChartCapability = {
  component: "OrbitDiagram",
  family: "hierarchy",
  importPath: "semiotic/network",
  rubric: { familiarity: 1, accuracy: 2, precision: 2 },

  fits: (profile) => {
    if (!profile.hasHierarchy || !profile.hierarchy) return "needs a hierarchical root"
    return null
  },

  intentScores: { "hierarchy": 3 },

  caveats: () => ["decorative — readers without context will not infer hierarchy easily"],

  buildProps: (profile) => ({
    data: profile.hierarchy ?? { name: "root", children: [] },
    orbitMode: "solar",
  }),
}
