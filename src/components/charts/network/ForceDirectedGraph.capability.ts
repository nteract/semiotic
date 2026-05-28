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

  // Network density is about node count, not row count. Sweet spot is the
  // band where individual nodes are reachable by eye and edges aren't a
  // hairball. Beyond ~300 nodes a force layout becomes the "blue smudge of
  // nothing in particular" — the chart suggestion should drop accordingly.
  scaleFit: (profile) => {
    const n = profile.network?.nodes.length ?? 0
    if (n < 5) {
      return { delta: -0.4, caveats: [`only ${n} nodes — force layout is overkill for this size`] }
    }
    if (n <= 100) {
      return { delta: 0.5, reason: `${n} nodes is in the readable range for force layout` }
    }
    if (n <= 300) return { delta: 0 }
    return {
      delta: -0.8,
      caveats: [`${n} nodes — expect a hairball; filter or aggregate before rendering`],
    }
  },
}
