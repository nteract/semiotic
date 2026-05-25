import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const ForceDirectedGraphCapability: ChartCapability = {
  component: "ForceDirectedGraph",
  family: "network",
  importPath: "semiotic/network",
  rubric: { familiarity: 3, accuracy: 3, precision: 3 },

  fits: (profile) => {
    if (!profile.hasNetwork || !profile.network) return "needs a {nodes, edges} network passed via rawInput"
    if (profile.network.nodes.length < 2) return "needs at least 2 nodes"
    if (profile.network.edges.length < 1) return "needs at least 1 edge"
    return null
  },

  intentScores: {
    "flow": 3,
    "correlation": 2,
  },

  caveats: (p) => {
    const n = p.network?.nodes.length ?? 0
    return n > 500 ? ["large graphs become hairballs — consider filtering or aggregating"] : []
  },

  buildProps: (profile) => ({
    nodes: profile.network?.nodes ?? [],
    edges: profile.network?.edges ?? [],
    // Canonical camelCase form. The chart still accepts `nodeIDAccessor` as a
    // deprecated alias, but the recommender should emit the supported name so
    // generated props don't carry a deprecation footgun forward.
    nodeIdAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
  }),
}
