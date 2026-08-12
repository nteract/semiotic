import { describe, expect, it } from "vitest"
import {
  assignSides,
  buildEdgeIndex,
  computeProcessSankeyLayout,
  countCrossings,
  totalEdgeLength,
  validateProcessSankey,
  type ProcessSankeyEdge,
  type ProcessSankeyNode
} from "./algorithm"
import { resolveProcessSankeyMarginDefaults } from "./frameMargins"
import { slotStableId } from "./layoutGeometry"

// The lane-ordering optimizers (countCrossings/totalEdgeLength and the reorder
// passes that consume them) previously had no direct tests — they were only
// reached transitively through computeProcessSankeyLayout with a single
// laneOrder. A tie-breaking or off-by-one bug there silently produces a
// worse-but-valid layout, invisible to node-count/position assertions.

describe("countCrossings", () => {
  it("counts a crossing when slot order inverts between source and target", () => {
    // A(0)→D(3) and B(1)→C(2): sources ordered A<B but targets ordered D>C,
    // so the two bands cross. Both overlap in time, no shared endpoints.
    const slots = { A: 0, B: 1, C: 2, D: 3 }
    const edges: ProcessSankeyEdge[] = [
      {
        id: "e1",
        source: "A",
        target: "D",
        value: 1,
        startTime: 0,
        endTime: 10
      },
      {
        id: "e2",
        source: "B",
        target: "C",
        value: 1,
        startTime: 0,
        endTime: 10
      }
    ]
    expect(countCrossings(slots, edges)).toBe(1)
  })

  it("counts zero when the bands run parallel", () => {
    // A(0)→C(2) and B(1)→D(3): order preserved on both ends → no crossing.
    const slots = { A: 0, B: 1, C: 2, D: 3 }
    const edges: ProcessSankeyEdge[] = [
      {
        id: "e1",
        source: "A",
        target: "C",
        value: 1,
        startTime: 0,
        endTime: 10
      },
      {
        id: "e2",
        source: "B",
        target: "D",
        value: 1,
        startTime: 0,
        endTime: 10
      }
    ]
    expect(countCrossings(slots, edges)).toBe(0)
  })

  it("ignores edge pairs that share an endpoint", () => {
    // A→D and A→C share source A — they fan out, never counted as a crossing.
    const slots = { A: 0, C: 2, D: 3 }
    const edges: ProcessSankeyEdge[] = [
      {
        id: "e1",
        source: "A",
        target: "D",
        value: 1,
        startTime: 0,
        endTime: 10
      },
      {
        id: "e2",
        source: "A",
        target: "C",
        value: 1,
        startTime: 0,
        endTime: 10
      }
    ]
    expect(countCrossings(slots, edges)).toBe(0)
  })

  it("ignores geometrically-crossing edges that are disjoint in time", () => {
    // Same inverting slots as the first case, but the time windows don't
    // overlap — temporally-separate flows can reuse a lane without crossing.
    const slots = { A: 0, B: 1, C: 2, D: 3 }
    const edges: ProcessSankeyEdge[] = [
      {
        id: "e1",
        source: "A",
        target: "D",
        value: 1,
        startTime: 0,
        endTime: 10
      },
      {
        id: "e2",
        source: "B",
        target: "C",
        value: 1,
        startTime: 20,
        endTime: 30
      }
    ]
    expect(countCrossings(slots, edges)).toBe(0)
  })
})

describe("totalEdgeLength", () => {
  it("sums |slot distance| weighted by edge value", () => {
    const slots = { A: 0, B: 2, C: 5 }
    const edges: ProcessSankeyEdge[] = [
      {
        id: "ab",
        source: "A",
        target: "B",
        value: 3,
        startTime: 0,
        endTime: 10
      }, // |0-2|*3 = 6
      {
        id: "bc",
        source: "B",
        target: "C",
        value: 2,
        startTime: 0,
        endTime: 10
      } // |2-5|*2 = 6
    ]
    expect(totalEdgeLength(slots, edges)).toBe(12)
  })

  it("treats a zero/absent value as 1", () => {
    const slots = { A: 0, B: 4 }
    const edges: ProcessSankeyEdge[] = [
      {
        id: "ab",
        source: "A",
        target: "B",
        value: 0,
        startTime: 0,
        endTime: 10
      } // |0-4|*1 = 4
    ]
    expect(totalEdgeLength(slots, edges)).toBe(4)
  })
})

describe("computeProcessSankeyLayout — laneOrder variants", () => {
  // A multi-flow graph with cross-connections (ae, cd) so lane ordering has
  // real choices to make. The existing suite only ever ran "crossing-min".
  const nodes: ProcessSankeyNode[] = [
    { id: "A" },
    { id: "B" },
    { id: "C" },
    { id: "D" },
    { id: "E" },
    { id: "F" }
  ]
  const edges: ProcessSankeyEdge[] = [
    {
      id: "ad",
      source: "A",
      target: "D",
      value: 5,
      startTime: 10,
      endTime: 30
    },
    {
      id: "be",
      source: "B",
      target: "E",
      value: 5,
      startTime: 10,
      endTime: 30
    },
    {
      id: "cf",
      source: "C",
      target: "F",
      value: 5,
      startTime: 10,
      endTime: 30
    },
    {
      id: "ae",
      source: "A",
      target: "E",
      value: 3,
      startTime: 12,
      endTime: 28
    },
    { id: "cd", source: "C", target: "D", value: 3, startTime: 12, endTime: 28 }
  ]
  const base = {
    plotH: 400,
    pairing: "temporal" as const,
    packing: "reuse" as const,
    lifetimeMode: "half" as const
  }
  const LANE_ORDERS = [
    "insertion",
    "crossing-min",
    "inside-out",
    "crossing-min+inside-out"
  ] as const

  for (const laneOrder of LANE_ORDERS) {
    it(`produces a valid layout for laneOrder="${laneOrder}"`, () => {
      const layout = computeProcessSankeyLayout(nodes, edges, {
        ...base,
        laneOrder
      })
      expect(layout).toBeTruthy()
      for (const n of nodes) {
        expect(layout.centerlines).toHaveProperty(n.id)
      }
      expect(
        layout.crossingsAfter === null || Number.isFinite(layout.crossingsAfter)
      ).toBe(true)
    })
  }

  it("crossing-minimizing lane orders never increase crossings vs. the initial order", () => {
    for (const laneOrder of [
      "crossing-min",
      "crossing-min+inside-out"
    ] as const) {
      const layout = computeProcessSankeyLayout(nodes, edges, {
        ...base,
        laneOrder
      })
      if (layout.crossingsBefore != null && layout.crossingsAfter != null) {
        expect(layout.crossingsAfter).toBeLessThanOrEqual(
          layout.crossingsBefore
        )
      }
    }
  })

  it("uses the scalable crossing-min reorder path for graphs larger than brute force", () => {
    const largeNodes: ProcessSankeyNode[] = []
    const largeEdges: ProcessSankeyEdge[] = []
    for (let i = 0; i < 9; i++) {
      largeNodes.push({ id: `S${i}`, xExtent: [0, 0] }, { id: `T${i}` })
      largeEdges.push({
        id: `e${i}`,
        source: `S${i}`,
        target: `T${8 - i}`,
        value: i + 1,
        startTime: 10,
        endTime: 20
      })
    }
    const layout = computeProcessSankeyLayout(largeNodes, largeEdges, {
      ...base,
      packing: "off",
      laneOrder: "crossing-min"
    })

    expect(layout.slots.length).toBe(18)
    expect(layout.crossingsBefore).not.toBeNull()
    expect(layout.crossingsAfter).not.toBeNull()
    expect(layout.lengthAfter).not.toBeNull()
  })

  it("keeps packing assignment stable across multi-pass side recompute", () => {
    const layout = computeProcessSankeyLayout(nodes, edges, {
      plotH: 400,
      packing: "reuse",
      laneOrder: "crossing-min",
      lifetimeMode: "half",
      pairing: "temporal"
    })
    // Occupant membership is frozen after the first pack; slot stable ids
    // must be fully ranked (no Infinity fallback to lexicographic order).
    const ids = layout.slots.map(slotStableId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.keys(layout.slotByNode).sort()).toEqual(
      nodes.map((n) => n.id).sort()
    )
  })

  it("preserves packing membership when plot height changes (scale-only reflow)", () => {
    const opts = {
      packing: "reuse" as const,
      laneOrder: "crossing-min" as const,
      lifetimeMode: "half" as const,
      pairing: "temporal" as const
    }
    const tall = computeProcessSankeyLayout(nodes, edges, {
      ...opts,
      plotH: 900
    })
    const short = computeProcessSankeyLayout(nodes, edges, {
      ...opts,
      plotH: 320
    })
    expect(short.slots.map(slotStableId)).toEqual(tall.slots.map(slotStableId))
    expect(short.slotByNode).toEqual(tall.slotByNode)
  })

  it("layouts zero-duration edges without throwing", () => {
    const layout = computeProcessSankeyLayout(
      [{ id: "A" }, { id: "B" }],
      [
        {
          id: "e",
          source: "A",
          target: "B",
          value: 2,
          startTime: 50,
          endTime: 50
        }
      ],
      { plotH: 200, packing: "off", laneOrder: "insertion" }
    )
    expect(layout.slots.length).toBeGreaterThan(0)
    expect(layout.nodeData.A).toBeDefined()
    expect(layout.nodeData.B).toBeDefined()
  })

  it("preserves node identifiers that match object prototype keys", () => {
    const specialIds = ["__proto__", "constructor", "toString"]
    const nodes = specialIds.map((id) => ({ id }))
    const edges: ProcessSankeyEdge[] = [
      {
        id: "prototype-to-constructor",
        source: "__proto__",
        target: "constructor",
        value: 3,
        startTime: 10,
        endTime: 20
      },
      {
        id: "constructor-to-string",
        source: "constructor",
        target: "toString",
        value: 3,
        startTime: 30,
        endTime: 40
      }
    ]

    expect(validateProcessSankey(nodes, edges, [0, 50])).toEqual([])
    const edgeIndex = buildEdgeIndex(nodes, edges)
    const layout = computeProcessSankeyLayout(nodes, edges, {
      plotH: 300,
      packing: "reuse",
      laneOrder: "crossing-min"
    })

    for (const id of specialIds) {
      expect(Object.hasOwn(edgeIndex.incoming, id)).toBe(true)
      expect(Object.hasOwn(edgeIndex.outgoing, id)).toBe(true)
      expect(Object.hasOwn(layout.nodeData, id)).toBe(true)
      expect(Object.hasOwn(layout.centerlines, id)).toBe(true)
      expect(Object.hasOwn(layout.laneLifetime, id)).toBe(true)
      expect(Object.hasOwn(layout.slotByNode, id)).toBe(true)
      expect(layout.nodeData[id].samples.length).toBeGreaterThan(0)
      expect(layout.centerlines[id]).toEqual(expect.any(Number))
      expect(layout.slotByNode[id]).toEqual(expect.any(Number))
    }
    expect(Object.keys(layout.nodeData).sort()).toEqual([...specialIds].sort())
  })
})

describe("ProcessSankey public defaults alignment", () => {
  it("assignSides defaults to temporal pairing", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "Hub" },
      { id: "Early" },
      { id: "Late" }
    ]
    const edges: ProcessSankeyEdge[] = [
      {
        id: "e-late",
        source: "Late",
        target: "Hub",
        value: 1,
        startTime: 30,
        endTime: 40
      },
      {
        id: "e-early",
        source: "Early",
        target: "Hub",
        value: 10,
        startTime: 10,
        endTime: 20
      }
    ]
    const index = buildEdgeIndex(nodes, edges)
    // Default (omitted pairing) must match explicit temporal.
    const def = assignSides(nodes, edges, index)
    const temporal = assignSides(nodes, edges, index, "temporal")
    expect([...def.entries()]).toEqual([...temporal.entries()])
  })

  it("margin defaults use 80px horizontal gutters for CSR/SSR parity", () => {
    const m = resolveProcessSankeyMarginDefaults(
      false,
      false,
      false,
      "horizontal"
    )
    expect(m.left).toBe(80)
    expect(m.right).toBe(80)
    expect(m.top).toBe(8)
  })
})
