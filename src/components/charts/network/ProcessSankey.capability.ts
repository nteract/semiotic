import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const ProcessSankeyCapability: ChartCapability = {
  component: "ProcessSankey",
  family: "flow",
  importPath: "semiotic/network",
  rubric: { familiarity: 2, accuracy: 4, precision: 3 },

  fits: (profile) => {
    if (!profile.hasNetwork || !profile.network) return "needs a {nodes, edges} network"
    // Edges need BOTH startTime and endTime (or start/end) — a process sankey
    // lays each edge along a time axis that runs from one to the other.
    const first = profile.network.edges[0]
    if (!first) return "needs at least one edge with start/end times"
    const hasStart = first.startTime !== undefined || first.start !== undefined
    const hasEnd = first.endTime !== undefined || first.end !== undefined
    if (!hasStart || !hasEnd) {
      return "edges need both startTime and endTime (or start/end) for a temporal sankey"
    }
    return null
  },

  intentScores: {
    "flow": 5,
    "composition-over-time": 4,
    "change-detection": 3,
  },

  buildProps: (profile) => {
    const props: Record<string, unknown> = {
      nodes: profile.network?.nodes ?? [],
      edges: profile.network?.edges ?? [],
      pairing: "temporal",
      laneOrder: "crossing-min",
    }
    // ProcessSankey defaults to `startTime` / `endTime` field names. If the
    // input data uses `start` / `end` instead (the alternative form fits()
    // accepts), emit the matching accessor props so the suggestion is
    // runnable without further patching.
    const first = profile.network?.edges[0]
    if (first) {
      if (first.startTime === undefined && first.start !== undefined) {
        props.startTimeAccessor = "start"
      }
      if (first.endTime === undefined && first.end !== undefined) {
        props.endTimeAccessor = "end"
      }
    }
    return props
  },
}
