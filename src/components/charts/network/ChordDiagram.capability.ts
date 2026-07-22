import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../../data/numericContracts"

export const ChordDiagramCapability: ChartCapability = {
  component: "ChordDiagram",
  family: "flow",
  importPath: "semiotic/network",
  rubric: { familiarity: 2, accuracy: 3, precision: 2 },
  numericContracts: BUILT_IN_NUMERIC_CONTRACTS.ChordDiagram,

  fits: (profile) => {
    if (!profile.hasNetwork || !profile.network) return "needs a {nodes, edges} network"
    if (profile.network.nodes.length < 3) return "needs 3+ nodes"
    if (profile.network.edges.length < 3) return "needs 3+ edges"
    return null
  },

  intentScores: {
    "flow": 4,
  },

  caveats: () => ["chord diagrams trade accuracy for symmetry; use Sankey if direction matters"],

  buildProps: (profile) => ({
    nodes: profile.network?.nodes ?? [],
    edges: profile.network?.edges ?? [],
    valueAccessor: "value",
  }),
}
