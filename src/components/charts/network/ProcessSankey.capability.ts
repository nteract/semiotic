import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const ProcessSankeyCapability: ChartCapability = {
  component: "ProcessSankey",
  family: "flow",
  importPath: "semiotic/network",
  rubric: { familiarity: 2, accuracy: 4, precision: 3 },

  fits: (profile) => {
    if (!profile.hasNetwork || !profile.network) return "needs a {nodes, edges} network"
    // Edges need startTime/endTime fields for a process sankey to make sense.
    const first = profile.network.edges[0]
    if (!first || (first.startTime === undefined && first.start === undefined)) {
      return "edges need startTime/endTime for a temporal sankey"
    }
    return null
  },

  intentScores: {
    "flow": 5,
    "composition-over-time": 4,
    "change-detection": 3,
  },

  buildProps: (profile) => ({
    nodes: profile.network?.nodes ?? [],
    edges: profile.network?.edges ?? [],
    pairing: "temporal",
    laneOrder: "crossing-min",
  }),
}
