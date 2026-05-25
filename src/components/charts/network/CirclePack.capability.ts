import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const CirclePackCapability: ChartCapability = {
  component: "CirclePack",
  family: "hierarchy",
  importPath: "semiotic/network",
  rubric: { familiarity: 3, accuracy: 3, precision: 2 },

  fits: (profile) => {
    if (!profile.hasHierarchy || !profile.hierarchy) return "needs a hierarchical root with values"
    return null
  },

  intentScores: {
    "hierarchy": 4,
    "part-to-whole": 3,
  },

  caveats: () => ["circle area is harder to compare than rectangle area"],

  buildProps: (profile) => ({
    data: profile.hierarchy ?? { name: "root", children: [] },
    valueAccessor: "value",
  }),
}
