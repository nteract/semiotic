import type { ChartCapability } from "../../ai/chartCapabilityTypes"

function edgeProbabilityField(edges: ReadonlyArray<Record<string, unknown>>): string | undefined {
  const candidates = ["p", "probability", "prob", "likelihood", "confidence"]
  return candidates.find((field) =>
    edges.some((edge) => {
      const value = Number(edge?.[field])
      return Number.isFinite(value) && value >= 0 && value <= 1
    })
  )
}

export const NetworkHOPsChartCapability: ChartCapability = {
  component: "NetworkHOPsChart",
  family: "network",
  importPath: "semiotic/physics",
  rubric: { familiarity: 2, accuracy: 3, precision: 2 },

  fits: (profile) => {
    if (!profile.hasNetwork || !profile.network) return "needs a {nodes, edges} network passed via rawInput"
    if (profile.network.nodes.length < 2) return "needs at least 2 nodes"
    if (profile.network.edges.length < 1) return "needs at least 1 uncertain or sampled edge"
    if (profile.network.nodes.length > 350) return "too many nodes for animated uncertainty replay"
    return null
  },

  intentScores: {
    flow: 2,
    correlation: 1,
    "change-detection": 2,
  },

  caveats: (profile) => {
    const edges = (profile.network?.edges ?? []) as ReadonlyArray<Record<string, unknown>>
    const probabilityField = edgeProbabilityField(edges)
    return probabilityField
      ? [
          `NetworkHOPsChart replays sampled graph outcomes from edge probability field "${probabilityField}"; use ForceDirectedGraph for a single fixed topology`,
        ]
      : [
          "NetworkHOPsChart assumes uncertain edges; provide samples or a probability field, otherwise ForceDirectedGraph is the simpler static network chart",
        ]
  },

  buildProps: (profile) => {
    const edges = (profile.network?.edges ?? []) as ReadonlyArray<Record<string, unknown>>
    return {
      nodes: profile.network?.nodes ?? [],
      edges: profile.network?.edges ?? [],
      nodeIdAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      edgeProbabilityAccessor: edgeProbabilityField(edges) ?? "p",
      showAggregate: true,
      sampleRate: 1,
    }
  },

  scaleFit: (profile) => {
    const n = profile.network?.nodes.length ?? 0
    if (n <= 8) {
      return { delta: -0.3, caveats: [`only ${n} nodes — sampled topology changes may be easier to explain in text`] }
    }
    if (n <= 120) {
      return { delta: 0.35, reason: `${n} nodes is small enough for stable animated outcome replay` }
    }
    return {
      delta: -0.6,
      caveats: [`${n} nodes — animated edge realizations can become hard to track; filter or aggregate first`],
    }
  },
}
