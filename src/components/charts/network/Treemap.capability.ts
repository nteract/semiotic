import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const TreemapCapability: ChartCapability = {
  component: "Treemap",
  family: "hierarchy",
  importPath: "semiotic/network",
  rubric: { familiarity: 4, accuracy: 3, precision: 3 },

  fits: (profile) => {
    if (!profile.hasHierarchy || !profile.hierarchy) return "needs a hierarchical root with values"
    return null
  },

  intentScores: {
    "hierarchy": 4,
    "part-to-whole": 4,
    "compare-categories": 3,
  },

  caveats: () => ["rectangle area comparisons are less precise than length — prefer a bar chart for ranking"],

  buildProps: (profile) => ({
    data: profile.hierarchy ?? { name: "root", children: [] },
    valueAccessor: "value",
  }),
}
