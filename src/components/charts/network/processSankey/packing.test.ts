import { describe, expect, it } from "vitest"
import type {
  ProcessSankeyEdge,
  ProcessSankeyLaneLifetime,
  ProcessSankeyNode,
  ProcessSankeyNodeData,
} from "./algorithm"
import {
  clearProcessSankeyPackingCache,
  packProcessSankeySlots,
  rehydrateProcessSankeySlots,
} from "./packing"

function band(start: number, end: number): ProcessSankeyNodeData {
  return {
    samples: [
      { t: start, topMass: 1, botMass: 0 },
      { t: end, topMass: 1, botMass: 0 },
    ],
    peak: 1,
    topPeak: 1,
    botPeak: 0,
    localAttachments: new Map(),
  }
}

describe("ProcessSankey temporal row packing", () => {
  it("does not reuse a bonded row for a different node group", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "states", group: "united-states" },
      { id: "foreign", group: "foreign-power" },
    ]
    const nodeData: Record<string, ProcessSankeyNodeData> = {
      states: band(0, 10),
      foreign: band(12, 20),
    }
    const laneLifetime: Record<string, ProcessSankeyLaneLifetime> = {
      states: { start: 0, end: 10 },
      foreign: { start: 12, end: 20 },
    }

    const layout = packProcessSankeySlots(nodes, [], nodeData, laneLifetime)

    expect(layout.slotByNode.states).not.toBe(layout.slotByNode.foreign)
  })

  it("allows a bonded feeder to hand off onto an ungrouped sink row", () => {
    // Multi-member bonded groups are simultaneous and need exclusive rows among
    // themselves, but a sequential handoff into an ungrouped sink is exactly the
    // continuity packing is meant to straighten — group identity must not forbid it.
    const nodes: ProcessSankeyNode[] = [
      { id: "Red", group: "founding" },
      { id: "White", group: "founding" },
      { id: "Blue", group: "founding" },
      { id: "States" },
    ]
    const nodeData: Record<string, ProcessSankeyNodeData> = {
      Red: band(0, 10),
      White: band(0, 10),
      Blue: band(0, 10),
      States: band(10, 40),
    }
    const laneLifetime: Record<string, ProcessSankeyLaneLifetime> = {
      Red: { start: 0, end: 10 },
      White: { start: 0, end: 10 },
      Blue: { start: 0, end: 10 },
      States: { start: 10, end: 40 },
    }
    const edges: ProcessSankeyEdge[] = [
      { id: "r", source: "Red", target: "States", value: 4, startTime: 10, endTime: 12 },
      { id: "w", source: "White", target: "States", value: 4, startTime: 10, endTime: 12 },
      { id: "b", source: "Blue", target: "States", value: 5, startTime: 10, endTime: 12 },
    ]

    const layout = packProcessSankeySlots(nodes, edges, nodeData, laneLifetime)

    // Simultaneous founding members still need three distinct rows.
    expect(new Set([
      layout.slotByNode.Red,
      layout.slotByNode.White,
      layout.slotByNode.Blue,
    ]).size).toBe(3)
    // At least one exclusive feeder lands on the sink row (continuity objective).
    const statesSlot = layout.slotByNode.States
    const foundingOnStates = ["Red", "White", "Blue"].filter(
      (id) => layout.slotByNode[id] === statesSlot,
    )
    expect(foundingOnStates.length).toBe(1)
    expect(layout.slots).toHaveLength(3)
  })

  it("does not let unrelated ungrouped nodes reuse a bonded feeder row", () => {
    // Without a direct edge, a later free node must not colonize a bonded row —
    // that would drag foreign traffic through the exclusive feeder block.
    const nodes: ProcessSankeyNode[] = [
      { id: "Red", group: "founding" },
      { id: "States" },
      { id: "Later" },
    ]
    const nodeData: Record<string, ProcessSankeyNodeData> = {
      Red: band(0, 10),
      States: band(10, 40),
      Later: band(50, 60),
    }
    const laneLifetime: Record<string, ProcessSankeyLaneLifetime> = {
      Red: { start: 0, end: 10 },
      States: { start: 10, end: 40 },
      Later: { start: 50, end: 60 },
    }
    const edges: ProcessSankeyEdge[] = [
      { id: "r", source: "Red", target: "States", value: 4, startTime: 10, endTime: 12 },
    ]

    const layout = packProcessSankeySlots(nodes, edges, nodeData, laneLifetime)

    expect(layout.slotByNode.Red).toBe(layout.slotByNode.States)
    expect(layout.slotByNode.Later).not.toBe(layout.slotByNode.Red)
  })

  function alternatePhaseFixture(overlappingRails: boolean) {
    const nodes: ProcessSankeyNode[] = [
      { id: "Orbit" },
      { id: "Lifeboat" },
      { id: "LowPass" },
      { id: "Surface" },
      { id: "Recovery" },
    ]
    const nodeData: Record<string, ProcessSankeyNodeData> = {
      Orbit: band(0, 300),
      Lifeboat: band(50, 80),
      LowPass: band(100, 110),
      Surface: band(120, 200),
      Recovery: band(140, 310),
    }
    const laneLifetime = Object.fromEntries(
      Object.entries(nodeData).map(([id, data]) => [id, {
        start: data.samples[0].t,
        end: data.samples.at(-1)?.t ?? null,
      }]),
    ) as Record<string, ProcessSankeyLaneLifetime>
    if (overlappingRails) {
      laneLifetime.LowPass = { start: 90, end: 115 }
      laneLifetime.Surface = { start: 110, end: 210 }
    }
    const edges: ProcessSankeyEdge[] = [
      { id: "orbit-low", source: "Orbit", target: "LowPass", value: 2, startTime: 90, endTime: 100 },
      { id: "low-orbit", source: "LowPass", target: "Orbit", value: 2, startTime: 110, endTime: 115 },
      { id: "orbit-surface", source: "Orbit", target: "Surface", value: 12, startTime: 110, endTime: 120 },
      { id: "surface-orbit", source: "Surface", target: "Orbit", value: 12, startTime: 200, endTime: 210 },
      { id: "orbit-recovery", source: "Orbit", target: "Recovery", value: 24, startTime: 130, endTime: 140 },
      { id: "lifeboat-recovery", source: "Lifeboat", target: "Recovery", value: 3, startTime: 80, endTime: 140 },
    ]

    return packProcessSankeySlots(nodes, edges, nodeData, laneLifetime)
  }

  it("uses shared predecessor/successor roles to place well-separated alternate phases", () => {
    const layout = alternatePhaseFixture(false)

    expect(layout.slots).toHaveLength(3)
    expect(layout.slotByNode.LowPass).toBe(layout.slotByNode.Surface)
    expect(layout.slotByNode.Lifeboat).toBe(layout.slotByNode.Recovery)
    expect(layout.slotByNode.Orbit).not.toBe(layout.slotByNode.LowPass)
  })

  it("gives close alternate phases a spill row when their transition rails overlap", () => {
    const layout = alternatePhaseFixture(true)

    expect(layout.slots).toHaveLength(4)
    expect(layout.slotByNode.LowPass).not.toBe(layout.slotByNode.Surface)
    expect(layout.slotByNode.LowPass).not.toBe(layout.slotByNode.Lifeboat)
    expect(layout.slotByNode.LowPass).not.toBe(layout.slotByNode.Recovery)
    expect(layout.slotByNode.Lifeboat).toBe(layout.slotByNode.Recovery)
  })

  it("keeps sequential accumulators reusable when they only share a sink", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "PR1" }, { id: "PR2" }, { id: "Library" },
    ]
    const nodeData: Record<string, ProcessSankeyNodeData> = {
      PR1: band(0, 10),
      PR2: band(12, 20),
      Library: band(30, 50),
    }
    const laneLifetime: Record<string, ProcessSankeyLaneLifetime> = {
      PR1: { start: 0, end: 15 },
      PR2: { start: 8, end: 25 },
      Library: { start: 20, end: 50 },
    }
    const edges: ProcessSankeyEdge[] = [
      { id: "pr1-library", source: "PR1", target: "Library", value: 5, startTime: 10, endTime: 30 },
      { id: "pr2-library", source: "PR2", target: "Library", value: 5, startTime: 20, endTime: 35 },
    ]

    const layout = packProcessSankeySlots(nodes, edges, nodeData, laneLifetime)

    expect(layout.slots).toHaveLength(1)
    expect(layout.slotByNode.PR1).toBe(layout.slotByNode.PR2)
    expect(layout.slotByNode.PR2).toBe(layout.slotByNode.Library)
  })

  it("preserves dominant predecessor rows beyond the exact-search size limit", () => {
    const nodes: ProcessSankeyNode[] = []
    const nodeData: Record<string, ProcessSankeyNodeData> = {}
    const laneLifetime: Record<string, ProcessSankeyLaneLifetime> = {}
    const edges: ProcessSankeyEdge[] = []

    for (let stage = 0; stage < 7; stage++) {
      for (const prefix of ["A", "B"]) {
        const id = `${prefix}${stage}`
        nodes.push({ id })
        nodeData[id] = band(stage * 2, stage * 2 + 1)
        laneLifetime[id] = { start: stage * 2, end: stage * 2 + 1 }
      }
      if (stage === 0) continue
      // The first transition deliberately reverses the lexical order. A
      // first-compatible-row greedy pass puts both continuations in the wrong
      // row; affinity-aware packing keeps each direct handoff straight.
      const sourceA = stage === 1 ? "B0" : `A${stage - 1}`
      const sourceB = stage === 1 ? "A0" : `B${stage - 1}`
      edges.push(
        { id: `a${stage}`, source: sourceA, target: `A${stage}`, value: 9, startTime: stage * 2 - 1, endTime: stage * 2 },
        { id: `b${stage}`, source: sourceB, target: `B${stage}`, value: 8, startTime: stage * 2 - 1, endTime: stage * 2 },
      )
    }

    const layout = packProcessSankeySlots(nodes, edges, nodeData, laneLifetime)

    expect(nodes).toHaveLength(14)
    expect(layout.slots).toHaveLength(2)
    expect(layout.slotByNode.A1).toBe(layout.slotByNode.B0)
    expect(layout.slotByNode.B1).toBe(layout.slotByNode.A0)
    for (let stage = 2; stage < 7; stage++) {
      expect(layout.slotByNode[`A${stage}`]).toBe(layout.slotByNode.A1)
      expect(layout.slotByNode[`B${stage}`]).toBe(layout.slotByNode.B1)
    }
  })

  it("moves a large-chart continuation into an available predecessor row", () => {
    const nodes: ProcessSankeyNode[] = []
    const nodeData: Record<string, ProcessSankeyNodeData> = {}
    const laneLifetime: Record<string, ProcessSankeyLaneLifetime> = {}
    const edges: ProcessSankeyEdge[] = []

    for (const id of ["A0", "B0", "C0"]) {
      nodes.push({ id })
      nodeData[id] = band(0, 1)
      laneLifetime[id] = { start: 0, end: 1 }
    }
    for (let stage = 1; stage <= 10; stage++) {
      const id = `A${stage}`
      nodes.push({ id })
      nodeData[id] = band(stage * 2, stage * 2 + 1)
      laneLifetime[id] = { start: stage * 2, end: stage * 2 + 1 }
      edges.push({
        id: `e${stage}`,
        source: stage === 1 ? "B0" : `A${stage - 1}`,
        target: id,
        value: 5,
        startTime: stage * 2 - 1,
        endTime: stage * 2,
      })
    }

    const layout = packProcessSankeySlots(nodes, edges, nodeData, laneLifetime)

    expect(nodes).toHaveLength(13)
    expect(layout.slots).toHaveLength(3)
    expect(layout.slotByNode.A1).toBe(layout.slotByNode.B0)
    expect(layout.slotByNode.A10).toBe(layout.slotByNode.B0)
  })

  it("rehydrates peaks onto a frozen packing without changing membership", () => {
    clearProcessSankeyPackingCache()
    const nodes: ProcessSankeyNode[] = [
      { id: "A" },
      { id: "B" },
    ]
    const nodeData: Record<string, ProcessSankeyNodeData> = {
      A: band(0, 5),
      B: band(6, 10),
    }
    const laneLifetime: Record<string, ProcessSankeyLaneLifetime> = {
      A: { start: 0, end: 5 },
      B: { start: 6, end: 10 },
    }
    const packed = packProcessSankeySlots(nodes, [], nodeData, laneLifetime)
    const hot: Record<string, ProcessSankeyNodeData> = {
      A: {
        ...band(0, 5),
        topPeak: 9,
        botPeak: 2,
        peak: 11,
      },
      B: {
        ...band(6, 10),
        topPeak: 3,
        botPeak: 4,
        peak: 7,
      },
    }
    const rehydrated = rehydrateProcessSankeySlots(packed.slots, hot, laneLifetime)
    expect(rehydrated.slotByNode).toEqual(packed.slotByNode)
    expect(rehydrated.slots.map((s) => s.occupants.map((o) => o.id))).toEqual(
      packed.slots.map((s) => s.occupants.map((o) => o.id)),
    )
    for (const slot of rehydrated.slots) {
      const ids = slot.occupants.map((o) => o.id)
      const expectedTop = Math.max(...ids.map((id) => hot[id].topPeak))
      const expectedBot = Math.max(...ids.map((id) => hot[id].botPeak))
      expect(slot.peak.topPeak).toBe(expectedTop)
      expect(slot.peak.botPeak).toBe(expectedBot)
    }
  })

  it("caches packing membership across identical topology/mass signatures", () => {
    clearProcessSankeyPackingCache()
    const nodes: ProcessSankeyNode[] = [{ id: "A" }, { id: "B" }]
    const nodeData: Record<string, ProcessSankeyNodeData> = {
      A: band(0, 4),
      B: band(5, 9),
    }
    const laneLifetime: Record<string, ProcessSankeyLaneLifetime> = {
      A: { start: 0, end: 4 },
      B: { start: 5, end: 9 },
    }
    const first = packProcessSankeySlots(nodes, [], nodeData, laneLifetime)
    const second = packProcessSankeySlots(nodes, [], nodeData, laneLifetime)
    expect(second.slotByNode).toEqual(first.slotByNode)
    expect(second.slots.map((s) => s.occupants.map((o) => o.id))).toEqual(
      first.slots.map((s) => s.occupants.map((o) => o.id)),
    )
  })
})
