import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../../data/numericContracts"

export const SankeyDiagramCapability: ChartCapability = {
  component: "SankeyDiagram",
  family: "flow",
  importPath: "semiotic/network",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },
  numericContracts: BUILT_IN_NUMERIC_CONTRACTS.SankeyDiagram,

  fits: (profile) => {
    if (!profile.hasNetwork || !profile.network) return "needs a {nodes, edges} network with edge weights"
    if (profile.network.edges.length < 2) return "needs 2+ weighted edges"
    return null
  },

  intentScores: {
    "flow": 5,
    "part-to-whole": 3,
  },

  buildProps: (profile) => ({
    nodes: profile.network?.nodes ?? [],
    edges: profile.network?.edges ?? [],
    sourceAccessor: "source",
    targetAccessor: "target",
    valueAccessor: "value",
    nodeIdAccessor: "id",
  }),
}
