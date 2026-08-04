import { describe, it, expect } from "vitest"
import { computeProcessSankeyLayout } from "./algorithm"
import {
  US_PROCESS_NODES,
  US_PROCESS_EDGES,
  US_DOMAIN,
  US_CORE_NODE_IDS,
} from "../../../../../docs/src/pages/examples/data/unitedStatesHistoryRiver.js"

type UsRiverNode = {
  id: string
  group?: string
  xExtent?: readonly [number | string, number | string]
}

type UsRiverEdge = {
  id: string
  source: string
  target: string
  value: number
  startTime: number | string
  endTime: number | string
  systemInTime?: number | string | null
  systemOutTime?: number | string | null
}

function toLayoutInput() {
  const nodes = (US_PROCESS_NODES as UsRiverNode[]).map((n) => ({
    id: n.id,
    group: n.group,
    xExtent: n.xExtent ? [Number(n.xExtent[0]), Number(n.xExtent[1])] as [number, number] : undefined,
  }))
  const edges = (US_PROCESS_EDGES as UsRiverEdge[]).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    value: e.value,
    startTime: Number(e.startTime),
    endTime: Number(e.endTime),
    systemInTime: e.systemInTime != null ? Number(e.systemInTime) : undefined,
    systemOutTime: e.systemOutTime != null ? Number(e.systemOutTime) : undefined,
  }))
  return { nodes, edges }
}

/**
 * Integration guard for the generic packing + unit-ordering fixes that the US
 * river example exercises hard: multi-slot bonded feeders that hand off into a
 * long-lived ungrouped sink, plus dense temporal row reuse. The assertions are
 * topology-generic (contiguity, handoff co-location, non-regression of
 * crossings) — not US-specific slot indices.
 */
describe("US river layout — bonded feeder proximity", () => {
  it("packs at least one founding member onto the US_STATES row and keeps the bond contiguous around it", () => {
    const { nodes, edges } = toLayoutInput()
    const full = computeProcessSankeyLayout(nodes, edges, {
      plotH: 2800,
      packing: "reuse",
      laneOrder: "crossing-min+inside-out",
      lanePlacement: "hug",
      lifetimeMode: "full",
      domain: [US_DOMAIN[0], US_DOMAIN[1]],
      maxValueScale: 28,
    })

    const founding = ["MIDDLE_COLONIES", "NEW_ENGLAND_COLONIES", "SOUTHERN_COLONIES"]
    const foundingSlots = founding.map((id) => full.slotByNode[id])
    const states = full.slotByNode[US_CORE_NODE_IDS.states]
    const fMin = Math.min(...foundingSlots)
    const fMax = Math.max(...foundingSlots)

    // Bonded multi-slot group stays contiguous.
    expect(fMax - fMin).toBe(founding.length - 1)
    // Sequential handoff: at least one founding feeder shares the sink row.
    expect(foundingSlots).toContain(states)
    // The bonded block envelops the sink row (exclusive feeders sit in line
    // with what they feed, not parked in a far lane).
    expect(states).toBeGreaterThanOrEqual(fMin)
    expect(states).toBeLessThanOrEqual(fMax)

    // Crossing-min must not regress vs the bonded packing seed.
    if (full.crossingsBefore != null && full.crossingsAfter != null) {
      expect(full.crossingsAfter).toBeLessThanOrEqual(full.crossingsBefore)
    }
  })

  it("does not leave high-value exclusive founding handoffs spanning distant lanes", () => {
    const { nodes, edges } = toLayoutInput()
    const full = computeProcessSankeyLayout(nodes, edges, {
      plotH: 2800,
      packing: "reuse",
      laneOrder: "crossing-min+inside-out",
      lanePlacement: "hug",
      lifetimeMode: "full",
      domain: [US_DOMAIN[0], US_DOMAIN[1]],
      maxValueScale: 28,
    })

    const foundingEdges = edges.filter((e) =>
      ["MIDDLE_COLONIES", "NEW_ENGLAND_COLONIES", "SOUTHERN_COLONIES"].includes(e.source) &&
      e.target === US_CORE_NODE_IDS.states,
    )
    expect(foundingEdges.length).toBe(3)
    for (const edge of foundingEdges) {
      const span = Math.abs(full.slotByNode[edge.source] - full.slotByNode[edge.target])
      // Same-row handoff (0) or adjacent bonded sibling (1–2) — never the old
      // far-lane span of 3–5 that forced ribbons through unrelated packs.
      expect(span).toBeLessThanOrEqual(2)
    }
  })
})

describe("US river layout budget (M1 AC3)", () => {
  it("computes the full flagship layout under a CI-friendly budget", () => {
    const { nodes, edges } = toLayoutInput()
    const opts = {
      plotH: 2800,
      packing: "reuse" as const,
      laneOrder: "crossing-min+inside-out" as const,
      lanePlacement: "hug" as const,
      lifetimeMode: "full" as const,
      domain: [US_DOMAIN[0], US_DOMAIN[1]] as [number, number],
      maxValueScale: 28,
    }

    // Warm packing cache once so the timed pass matches a resize reflow
    // (topology already packed; order + geometry dominate).
    computeProcessSankeyLayout(nodes, edges, opts)

    const start = performance.now()
    const layout = computeProcessSankeyLayout(nodes, edges, opts)
    const elapsed = performance.now() - start

    // Recorded budget: warm reflow soft target 250ms; hard gate is 2× (500ms).
    expect(layout.layoutQuality.crossings).toBe(0)
    expect(elapsed).toBeLessThan(500)
  })
})
