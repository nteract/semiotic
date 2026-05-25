import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const TreeDiagramCapability: ChartCapability = {
  component: "TreeDiagram",
  family: "hierarchy",
  importPath: "semiotic/network",
  rubric: { familiarity: 4, accuracy: 4, precision: 3 },

  fits: (profile) => {
    if (!profile.hasHierarchy || !profile.hierarchy) return "needs a hierarchical root (object with children) via rawInput"
    return null
  },

  intentScores: { "hierarchy": 5 },

  variants: [
    { key: "vertical-tree", label: "Vertical tree", props: { layout: "tree", orientation: "vertical" }, tags: ["vertical"] },
    { key: "horizontal-cluster", label: "Horizontal cluster", props: { layout: "cluster", orientation: "horizontal" }, tags: ["horizontal"] },
  ],

  buildProps: (profile, variant) => ({
    data: profile.hierarchy ?? { name: "root", children: [] },
    ...(variant?.props ?? {}),
  }),
}
