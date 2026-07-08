import type { ChartCapability } from "../../ai/chartCapabilityTypes"

function hasFiniteCoordinate(value: unknown): boolean {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number)
}

function hasRouteGeometry(
  nodes: ReadonlyArray<Record<string, unknown>>,
  edges: ReadonlyArray<Record<string, unknown>>
): boolean {
  return (
    nodes.some((node) => hasFiniteCoordinate(node.x) && hasFiniteCoordinate(node.y)) ||
    edges.some((edge) => Array.isArray(edge.path) || Array.isArray(edge.points) || Array.isArray(edge.route))
  )
}

function throughputField(edges: ReadonlyArray<Record<string, unknown>>): string {
  const candidates = ["value", "throughput", "traffic", "rate", "volume", "count"]
  return candidates.find((field) =>
    edges.some((edge) => {
      const value = Number(edge?.[field])
      return Number.isFinite(value) && value > 0
    })
  ) ?? "value"
}

export const PhysicalFlowChartCapability: ChartCapability = {
  component: "PhysicalFlowChart",
  family: "flow",
  importPath: "semiotic/physics",
  rubric: { familiarity: 2, accuracy: 2, precision: 1 },

  fits: (profile) => {
    if (!profile.hasNetwork || !profile.network) return "needs explicit {nodes, edges} or {nodes, links} route input"
    if (profile.network.edges.length < 1) return "needs at least 1 flow link"
    if (profile.network.edges.length > 160) return "too many links for animated particle flow"
    const nodes = profile.network.nodes as ReadonlyArray<Record<string, unknown>>
    const edges = profile.network.edges as ReadonlyArray<Record<string, unknown>>
    if (!hasRouteGeometry(nodes, edges)) {
      return "requires authored node x/y coordinates or per-link path geometry; use SankeyDiagram for plain source-target-value data"
    }
    return null
  },

  intentScores: {
    flow: 4,
    "change-detection": 1,
    "part-to-whole": 1,
  },

  caveats: () => [
    "PhysicalFlowChart is experimental: keep showStaticFlow enabled so throughput remains readable when animation is paused or reduced",
    "Requires explicit route geometry; it does not infer physical pipe paths from a flat source-target table",
  ],

  buildProps: (profile) => {
    const edges = (profile.network?.edges ?? []) as ReadonlyArray<Record<string, unknown>>
    return {
      nodes: profile.network?.nodes ?? [],
      links: profile.network?.edges ?? [],
      nodeIdAccessor: "id",
      nodeXAccessor: "x",
      nodeYAccessor: "y",
      sourceAccessor: "source",
      targetAccessor: "target",
      throughputAccessor: throughputField(edges),
      showStaticFlow: true,
      showSensors: true,
      maxParticles: 160,
    }
  },

  scaleFit: (profile) => {
    const links = profile.network?.edges.length ?? 0
    if (links <= 4) {
      return { delta: -0.2, caveats: [`only ${links} links — a static Sankey may communicate the flow more directly`] }
    }
    if (links <= 60) {
      return { delta: 0.2, reason: `${links} links is small enough for route-constrained packet animation` }
    }
    return {
      delta: -0.7,
      caveats: [`${links} links can create occlusion and packet budget pressure; aggregate routes first`],
    }
  },
}
