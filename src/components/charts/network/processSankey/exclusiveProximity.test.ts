import { describe, expect, it } from "vitest"
import {
  computeProcessSankeyLayout,
  type ProcessSankeyEdge,
  type ProcessSankeyNode,
} from "./algorithm"
import {
  US_PROCESS_NODES,
  US_PROCESS_EDGES,
  US_DOMAIN,
  US_CORE_NODE_IDS,
} from "../../../../../docs/src/pages/examples/data/unitedStatesHistoryRiver.js"

const MASS_EPSILON = 1e-9

/**
 * Intermediate slots with no occupant mass during [t0, t1]. Ribbons that pass
 * through these lanes are pure visual detours — "edges crossing nodes" that
 * packing/ordering could have avoided by placing the endpoints closer.
 */
function vacantIntermediateSlots(
  layout: {
    slots: ReadonlyArray<{ occupants: ReadonlyArray<{ id: string }> }>
    nodeData: Record<string, { samples: ReadonlyArray<{ t: number; topMass: number; botMass: number }> }>
  },
  sourceSlot: number,
  targetSlot: number,
  t0: number,
  t1: number,
): number[] {
  const lo = Math.min(sourceSlot, targetSlot)
  const hi = Math.max(sourceSlot, targetSlot)
  const vacant: number[] = []
  for (let slotIndex = lo + 1; slotIndex < hi; slotIndex++) {
    let hasMass = false
    for (const occupant of layout.slots[slotIndex].occupants) {
      const data = layout.nodeData[occupant.id]
      for (const sample of data?.samples ?? []) {
        if (
          sample.t >= t0 &&
          sample.t <= t1 &&
          sample.topMass + sample.botMass > MASS_EPSILON
        ) {
          hasMass = true
          break
        }
      }
      if (hasMass) break
    }
    if (!hasMass) vacant.push(slotIndex)
  }
  return vacant
}

function exclusiveOutgoing(edges: readonly ProcessSankeyEdge[]): Map<string, string> {
  const targets = new Map<string, Set<string>>()
  for (const edge of edges) {
    const set = targets.get(edge.source) ?? new Set()
    set.add(edge.target)
    targets.set(edge.source, set)
  }
  const exclusive = new Map<string, string>()
  for (const [source, set] of targets) {
    if (set.size === 1) exclusive.set(source, [...set][0])
  }
  return exclusive
}

/**
 * Score vacant-lane transit only on the handoffs that are clearly "extraneous
 * crossings": a temporary exclusive branch (mutual single partner) or a heavy
 * exclusive feeder (value ≥ 3). Lightweight fan-in like per-state statehood
 * edges may still cross empty historical lanes when a heavier branch claims the
 * single free adjacent slot next to a long-lived core — that tradeoff is
 * intentional and is not what this score polices.
 */
function vacantTransitScore(
  layout: {
    slots: ReadonlyArray<{ occupants: ReadonlyArray<{ id: string }> }>
    slotByNode: Record<string, number>
    nodeData: Record<string, { samples: ReadonlyArray<{ t: number; topMass: number; botMass: number }> }>
  },
  edges: readonly ProcessSankeyEdge[],
): { vacantEdgeCount: number; vacantWeightedLanes: number; details: string[] } {
  const exclusive = exclusiveOutgoing(edges)
  const partnersOf = (id: string): Set<string> => {
    const set = new Set<string>()
    for (const edge of edges) {
      if (edge.source === id) set.add(edge.target)
      if (edge.target === id) set.add(edge.source)
    }
    return set
  }
  let vacantEdgeCount = 0
  let vacantWeightedLanes = 0
  const details: string[] = []
  for (const edge of edges) {
    const sourceExclusive = exclusive.get(edge.source) === edge.target
    const sourcePartners = partnersOf(edge.source)
    const targetPartners = partnersOf(edge.target)
    const mutualBranch =
      sourcePartners.size === 1 && sourcePartners.has(edge.target) &&
      targetPartners.size === 1 && targetPartners.has(edge.source)
    // Value ≥ 4 captures secession/restoration waves and multi-member
    // acquisitions; lighter exclusive feeders may still hop one empty lane
    // when a heavier branch owns the only free adjacent slot.
    const heavyExclusive = sourceExclusive && edge.value >= 4
    if (!mutualBranch && !heavyExclusive) continue
    const sourceSlot = layout.slotByNode[edge.source]
    const targetSlot = layout.slotByNode[edge.target]
    if (sourceSlot == null || targetSlot == null) continue
    if (Math.abs(sourceSlot - targetSlot) < 2) continue
    const vacant = vacantIntermediateSlots(
      layout, sourceSlot, targetSlot, edge.startTime, edge.endTime,
    )
    if (vacant.length === 0) continue
    vacantEdgeCount += 1
    const weight = edge.value > 0 ? edge.value : 1
    vacantWeightedLanes += vacant.length * weight
    details.push(
      `${edge.id} ${edge.source}@${sourceSlot}->${edge.target}@${targetSlot} vacant=[${vacant.join(",")}] v=${weight}`,
    )
  }
  return { vacantEdgeCount, vacantWeightedLanes, details }
}

describe("exclusive feeder proximity (TDD)", () => {
  it("keeps an exclusive temporary branch adjacent to its only partner (no vacant-lane transit)", () => {
    // Core is long-lived. Branch leaves and returns only to Core. Early bonded
    // feeders hand into Core and then go dark — parking Branch on the far side
    // of those dead lanes forces secession-style ribbons through empty history.
    const nodes: ProcessSankeyNode[] = [
      { id: "Red", group: "founding", xExtent: [0, 10] },
      { id: "White", group: "founding", xExtent: [0, 10] },
      { id: "Blue", group: "founding", xExtent: [0, 10] },
      { id: "Core", xExtent: [10, 100] },
      { id: "Branch", xExtent: [40, 60] },
      { id: "NoiseIn", xExtent: [20, 25] },
      { id: "NoiseOut", xExtent: [70, 80] },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "r", source: "Red", target: "Core", value: 4, startTime: 10, endTime: 12 },
      { id: "w", source: "White", target: "Core", value: 4, startTime: 10, endTime: 12 },
      { id: "b", source: "Blue", target: "Core", value: 5, startTime: 10, endTime: 12 },
      { id: "leave", source: "Core", target: "Branch", value: 11, startTime: 40, endTime: 42 },
      { id: "return", source: "Branch", target: "Core", value: 11, startTime: 58, endTime: 60 },
      { id: "nin", source: "NoiseIn", target: "Core", value: 1, startTime: 25, endTime: 27 },
      { id: "nout", source: "NoiseOut", target: "Core", value: 1, startTime: 80, endTime: 82 },
    ]

    const layout = computeProcessSankeyLayout(nodes, edges, {
      plotH: 600,
      packing: "reuse",
      laneOrder: "crossing-min+inside-out",
      lifetimeMode: "full",
      pairing: "temporal",
    })

    const coreSlot = layout.slotByNode.Core
    const branchSlot = layout.slotByNode.Branch
    expect(layout.layoutQuality.crossings).toBe(0)
    // Branch must sit on or next to Core — not across the dead founding block.
    expect(Math.abs(coreSlot - branchSlot)).toBeLessThanOrEqual(1)

    for (const edge of edges.filter((e) =>
      (e.source === "Core" && e.target === "Branch") ||
      (e.source === "Branch" && e.target === "Core"),
    )) {
      const vacant = vacantIntermediateSlots(
        layout,
        layout.slotByNode[edge.source],
        layout.slotByNode[edge.target],
        edge.startTime,
        edge.endTime,
      )
      expect(vacant, `${edge.id} vacant transit`).toEqual([])
    }

    // Bonded founders stay contiguous and still touch Core.
    const foundingSlots = ["Red", "White", "Blue"].map((id) => layout.slotByNode[id])
    expect(Math.max(...foundingSlots) - Math.min(...foundingSlots)).toBe(2)
    expect(foundingSlots).toContain(coreSlot)
  })

  it("does not pack exclusive feeders to different sinks onto the same row when a free row exists", () => {
    // Role-aware packing: a Confed→States exclusive branch and a Panama→Colonies
    // exclusive feeder must not share a physical row — that forces later ordering
    // to drag one exclusive handoff across the other's partner.
    const nodes: ProcessSankeyNode[] = [
      { id: "States", xExtent: [0, 100] },
      { id: "Colonies", xExtent: [50, 100] },
      { id: "Confed", xExtent: [40, 60] },
      { id: "Panama", xExtent: [70, 80] },
      { id: "FillerA", xExtent: [10, 15] },
      { id: "FillerB", xExtent: [20, 25] },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "leave", source: "States", target: "Confed", value: 10, startTime: 40, endTime: 42 },
      { id: "return", source: "Confed", target: "States", value: 10, startTime: 58, endTime: 60 },
      { id: "panama", source: "Panama", target: "Colonies", value: 3, startTime: 70, endTime: 72 },
      { id: "fa", source: "FillerA", target: "States", value: 1, startTime: 15, endTime: 17 },
      { id: "fb", source: "FillerB", target: "States", value: 1, startTime: 25, endTime: 27 },
    ]

    const layout = computeProcessSankeyLayout(nodes, edges, {
      plotH: 500,
      packing: "reuse",
      laneOrder: "crossing-min+inside-out",
      lifetimeMode: "full",
      pairing: "temporal",
    })

    expect(layout.layoutQuality.crossings).toBe(0)
    // Different exclusive destinations must not share a packed row.
    expect(layout.slotByNode.Confed).not.toBe(layout.slotByNode.Panama)
    // Each exclusive feeder sits next to (or on) its own sink.
    expect(Math.abs(layout.slotByNode.Confed - layout.slotByNode.States)).toBeLessThanOrEqual(1)
    expect(Math.abs(layout.slotByNode.Panama - layout.slotByNode.Colonies)).toBeLessThanOrEqual(1)
  })

  it("never increases authored crossings while removing vacant-lane transit on exclusive edges", () => {
    // Cross-cutting contract for the optimizer: secondary proximity wins must
    // not buy themselves by inventing new pairwise crossings.
    const nodes: ProcessSankeyNode[] = [
      { id: "A", xExtent: [0, 10] },
      { id: "B", xExtent: [0, 10] },
      { id: "C", xExtent: [0, 10] },
      { id: "D", xExtent: [10, 40] },
      { id: "E", xExtent: [10, 40] },
      { id: "F", xExtent: [10, 40] },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "ad", source: "A", target: "D", value: 5, startTime: 10, endTime: 20 },
      { id: "be", source: "B", target: "E", value: 5, startTime: 10, endTime: 20 },
      { id: "cf", source: "C", target: "F", value: 5, startTime: 10, endTime: 20 },
      { id: "ae", source: "A", target: "E", value: 2, startTime: 12, endTime: 18 },
      { id: "cd", source: "C", target: "D", value: 2, startTime: 12, endTime: 18 },
    ]
    const layout = computeProcessSankeyLayout(nodes, edges, {
      plotH: 400,
      packing: "off",
      laneOrder: "crossing-min+inside-out",
      lifetimeMode: "half",
      pairing: "temporal",
    })
    expect(layout.layoutQualityBefore.crossings).not.toBeNull()
    expect(layout.layoutQuality.crossings)
      .toBeLessThanOrEqual(layout.layoutQualityBefore.crossings!)
  })
})

describe("US river exclusive proximity (integration)", () => {
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
  }

  function usLayout() {
    const nodes = (US_PROCESS_NODES as UsRiverNode[]).map((n) => ({
      id: n.id,
      group: n.group,
      xExtent: n.xExtent
        ? [Number(n.xExtent[0]), Number(n.xExtent[1])] as [number, number]
        : undefined,
    }))
    const edges = (US_PROCESS_EDGES as UsRiverEdge[]).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      value: e.value,
      startTime: Number(e.startTime),
      endTime: Number(e.endTime),
    }))
    const layout = computeProcessSankeyLayout(nodes, edges, {
      plotH: 2800,
      packing: "reuse",
      laneOrder: "crossing-min+inside-out",
      lanePlacement: "hug",
      lifetimeMode: "full",
      domain: [US_DOMAIN[0], US_DOMAIN[1]],
      maxValueScale: 28,
    })
    return { nodes, edges, layout }
  }

  it("demonstrates (then forbids) vacant-lane transit on heavy exclusive US handoffs", () => {
    const { edges, layout } = usLayout()
    const score = vacantTransitScore(layout, edges)

    // TDD red → green: before the proximity fix, secession/restoration ribbons
    // (value 4–11) and heavy exclusive feeders crossed empty founding lanes
    // (≈13 edges / ≈71 weighted). After the fix those heavy exclusive handoffs
    // must have zero vacant-lane transit, and authored pairwise crossings stay 0.
    expect(layout.layoutQuality.crossings).toBe(0)
    expect(
      score.vacantEdgeCount,
      `heavy exclusive vacant transit:\n${score.details.join("\n")}`,
    ).toBe(0)
    expect(score.vacantWeightedLanes).toBe(0)
  })

  it("keeps the confederate exclusive branch on/next to US_STATES", () => {
    const { layout } = usLayout()
    const states = layout.slotByNode[US_CORE_NODE_IDS.states]
    const confed = layout.slotByNode.CONFEDERATE_STATES
    expect(Math.abs(states - confed)).toBeLessThanOrEqual(1)
  })

  it("keeps late colonial exclusive feeders free of vacant transit through founding/core rows", () => {
    const { edges, layout } = usLayout()
    for (const sourceId of ["PANAMA_CANAL_TREATIES", "PACIFIC_TRUST_SOURCE"]) {
      const edge = edges.find((e) => e.source === sourceId)!
      expect(edge.target).toBe(US_CORE_NODE_IDS.colonies)
      const vacant = vacantIntermediateSlots(
        layout,
        layout.slotByNode[edge.source],
        layout.slotByNode[edge.target],
        edge.startTime,
        edge.endTime,
      )
      expect(vacant, sourceId).toEqual([])
      expect(Math.abs(
        layout.slotByNode[edge.source] - layout.slotByNode[edge.target],
      )).toBeLessThanOrEqual(1)
    }
  })

  it("does not regress pairwise crossings vs the packing seed", () => {
    const { layout } = usLayout()
    expect(layout.layoutQuality.crossings)
      .toBeLessThanOrEqual(layout.layoutQualityBefore.crossings)
    expect(layout.layoutQuality.crossings).toBe(0)
  })
})
