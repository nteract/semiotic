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
    const edges = profile.network?.edges ?? []
    const props: Record<string, unknown> = {
      nodes: profile.network?.nodes ?? [],
      edges,
      pairing: "temporal",
      laneOrder: "crossing-min",
    }
    // ProcessSankey defaults to `startTime` / `endTime` field names. If the
    // input data uses `start` / `end` instead (the alternative form fits()
    // accepts), emit the matching accessor props so the suggestion is
    // runnable without further patching.
    const first = edges[0]
    const startKey = first && first.startTime === undefined && first.start !== undefined
      ? "start"
      : "startTime"
    const endKey = first && first.endTime === undefined && first.end !== undefined
      ? "end"
      : "endTime"
    if (first) {
      if (startKey === "start") props.startTimeAccessor = "start"
      if (endKey === "end") props.endTimeAccessor = "end"
    }
    // Schema requires domain:[t0,t1]. Derive from edge times so suggestCharts
    // props are renderChart-runnable without a second agent patch.
    let tMin = Infinity
    let tMax = -Infinity
    for (const e of edges) {
      const s = e?.[startKey]
      const en = e?.[endKey]
      const sN = s instanceof Date ? s.getTime() : typeof s === "number" ? s : s != null ? new Date(s as string).getTime() : NaN
      const eN = en instanceof Date ? en.getTime() : typeof en === "number" ? en : en != null ? new Date(en as string).getTime() : NaN
      if (Number.isFinite(sN)) { tMin = Math.min(tMin, sN); tMax = Math.max(tMax, sN) }
      if (Number.isFinite(eN)) { tMin = Math.min(tMin, eN); tMax = Math.max(tMax, eN) }
    }
    if (Number.isFinite(tMin) && Number.isFinite(tMax) && tMax >= tMin) {
      props.domain = [tMin, tMax === tMin ? tMin + 1 : tMax]
    }
    return props
  },
}
