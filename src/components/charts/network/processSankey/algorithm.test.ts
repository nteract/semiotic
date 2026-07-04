import { describe, it, expect } from "vitest"
import {
  validateProcessSankey,
  computeProcessSankeyLayout,
  buildEdgeIndex,
  assignSides,
  computeNode,
  clampTime,
  clampSamples,
  attachmentYRange,
  buildBandPath,
  buildBandCutoutsForNode,
  countCrossings,
  totalEdgeLength,
  formatProcessSankeyIssue,
  type ProcessSankeyNode,
  type ProcessSankeyEdge,
  type ProcessSankeyOptions,
  type ProcessSankeyAttachment,
} from "./algorithm"

const T = (n: number): number => n // ms — tests use small integers, no Date conversion needed

describe("validateProcessSankey", () => {
  const dom: [number, number] = [T(0), T(100)]

  it("returns no issues on a clean diamond", () => {
    const nodes: ProcessSankeyNode[] = [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }]
    const edges: ProcessSankeyEdge[] = [
      { id: "ab", source: "A", target: "B", value: 4, startTime: 10, endTime: 20 },
      { id: "ac", source: "A", target: "C", value: 4, startTime: 10, endTime: 20 },
      { id: "bd", source: "B", target: "D", value: 4, startTime: 30, endTime: 40 },
      { id: "cd", source: "C", target: "D", value: 4, startTime: 30, endTime: 40 },
    ]
    expect(validateProcessSankey(nodes, edges, dom)).toEqual([])
  })

  it("flags missing source nodes", () => {
    const issues = validateProcessSankey(
      [{ id: "B" }],
      [{ id: "e", source: "A", target: "B", value: 1, startTime: 10, endTime: 20 }],
      dom
    )
    expect(issues.some((i) => i.kind === "missing-node" && i.endpoint === "source")).toBe(true)
  })

  it("flags missing target nodes", () => {
    const issues = validateProcessSankey(
      [{ id: "A" }],
      [{ id: "e", source: "A", target: "B", value: 1, startTime: 10, endTime: 20 }],
      dom
    )
    expect(issues.some((i) => i.kind === "missing-node" && i.endpoint === "target")).toBe(true)
  })

  it("flags backward-in-time edges", () => {
    const issues = validateProcessSankey(
      [{ id: "A" }, { id: "B" }],
      [{ id: "e", source: "A", target: "B", value: 1, startTime: 30, endTime: 20 }],
      dom
    )
    expect(issues.some((i) => i.kind === "backward-edge")).toBe(true)
  })

  it("flags non-positive edge values", () => {
    const issues = validateProcessSankey(
      [{ id: "A" }, { id: "B" }],
      [{ id: "e", source: "A", target: "B", value: 0, startTime: 10, endTime: 20 }],
      dom
    )
    expect(issues.some((i) => i.kind === "invalid-value")).toBe(true)
  })

  it("flags non-finite edge times", () => {
    const issues = validateProcessSankey(
      [{ id: "A" }, { id: "B" }],
      [{ id: "e", source: "A", target: "B", value: 1, startTime: NaN, endTime: 20 }],
      dom
    )
    expect(issues.some((i) => i.kind === "invalid-edge-time")).toBe(true)
  })

  it("validates xExtent shape — must be [start, end] with start <= end", () => {
    // Each entry exercises a validation branch; bad shapes are deliberate
    // (the cast lets us pass malformed values past TS so we can confirm
    // the runtime check still flags them).
    const cases = [
      { id: "A", xExtent: [10, 20] },         // ok
      { id: "B", xExtent: [20, 10] },         // bad — start > end
      { id: "C", xExtent: [10] },              // bad — too short
      { id: "D", xExtent: [10, NaN] },         // bad — non-finite
      { id: "E", xExtent: "bogus" },           // bad — wrong type
    ] as unknown as ProcessSankeyNode[]
    const issues = validateProcessSankey(cases, [], dom)
    const badIds = issues.filter((i) => i.kind === "invalid-node-time").map((i) => i.id)
    expect((badIds as string[]).sort()).toEqual(["B", "C", "D", "E"])
  })

  it("formats issues with a stable shape", () => {
    const out = formatProcessSankeyIssue({ kind: "backward-edge", id: "e", source: "A", target: "B" })
    expect(out).toMatch(/backward-edge|ends before/i)
  })

  it("formats each known issue kind and falls back to the raw kind", () => {
    expect(formatProcessSankeyIssue({ kind: "invalid-node-time", id: "n" })).toContain("node n")
    expect(formatProcessSankeyIssue({ kind: "invalid-edge-time", id: "e" })).toContain("edge e")
    expect(formatProcessSankeyIssue({ kind: "invalid-domain" })).toContain("time domain")
    expect(formatProcessSankeyIssue({ kind: "invalid-value", id: "e" })).toContain("positive finite")
    expect(formatProcessSankeyIssue({ kind: "missing-node", id: "e", endpoint: "target", nodeId: "Z" })).toContain("missing target node")
    expect(formatProcessSankeyIssue({ kind: "unknown-kind" })).toBe("unknown-kind")
  })

  it("flags malformed/inverted domains", () => {
    const cases: unknown[] = [
      [],                  // wrong shape
      [10],                // wrong shape
      [10, 20, 30],        // wrong shape
      [NaN, 20],           // non-finite
      [10, Infinity],      // non-finite
      [50, 10],            // inverted (start > end)
    ]
    for (const dom of cases) {
      const issues = validateProcessSankey([], [], dom as [number, number])
      expect(issues.some((i) => i.kind === "invalid-domain")).toBe(true)
    }
    // Equal endpoints are allowed (start == end) since `<=` is permitted.
    const equalIssues = validateProcessSankey([], [], [10, 10])
    expect(equalIssues.some((i) => i.kind === "invalid-domain")).toBe(false)
  })
})

describe("buildEdgeIndex", () => {
  it("groups edges by source/target with zero-fill for nodes", () => {
    const nodes: ProcessSankeyNode[] = [{ id: "A" }, { id: "B" }, { id: "C" }]
    const edges: ProcessSankeyEdge[] = [
      { id: "ab", source: "A", target: "B", value: 1, startTime: 0, endTime: 1 },
      { id: "bc", source: "B", target: "C", value: 1, startTime: 1, endTime: 2 },
    ]
    const idx = buildEdgeIndex(nodes, edges)
    expect(idx.outgoing.A.map((e) => e.id)).toEqual(["ab"])
    expect(idx.outgoing.B.map((e) => e.id)).toEqual(["bc"])
    expect(idx.outgoing.C).toEqual([])
    expect(idx.incoming.A).toEqual([])
    expect(idx.incoming.C.map((e) => e.id)).toEqual(["bc"])
  })
})

describe("side assignment and node mass walks", () => {
  it("assigns alternating source/target sides by grouped value", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "A" },
      { id: "B" },
      { id: "C" },
      { id: "D" },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "ab1", source: "A", target: "B", value: 10, startTime: 1, endTime: 2 },
      { id: "ab2", source: "A", target: "B", value: 1, startTime: 3, endTime: 4 },
      { id: "ac", source: "A", target: "C", value: 5, startTime: 2, endTime: 3 },
      { id: "bd", source: "B", target: "D", value: 4, startTime: 5, endTime: 6 },
      { id: "cd", source: "C", target: "D", value: 7, startTime: 6, endTime: 7 },
    ]
    const sides = assignSides(nodes, edges, buildEdgeIndex(nodes, edges), "value")

    expect(sides.get("ab1")?.sourceSide).toBe("top")
    expect(sides.get("ab2")?.sourceSide).toBe("top")
    expect(sides.get("ac")?.sourceSide).toBe("bot")
    expect(sides.get("ab1")?.targetSide).toBe("top")
    expect(sides.get("bd")?.sourceSide).toBe("top")
    expect(sides.get("cd")?.sourceSide).toBe("top")
    expect(sides.get("bd")?.targetSide).toBe("bot")
    expect(sides.get("cd")?.targetSide).toBe("top")
  })

  it("synthesizes creates and transfers so outs never make a side negative", () => {
    const nodes: ProcessSankeyNode[] = [{ id: "A", xExtent: [0, 10] }, { id: "B" }, { id: "C" }]
    const edges: ProcessSankeyEdge[] = [
      { id: "ab", source: "A", target: "B", value: 5, startTime: 10, endTime: 20 },
      { id: "ac", source: "A", target: "C", value: 3, startTime: 12, endTime: 22 },
    ]
    const idx = buildEdgeIndex(nodes, edges)
    const sides = new Map([
      ["ab", { sourceSide: "top" as const }],
      ["ac", { sourceSide: "bot" as const }],
    ])
    const data = computeNode(nodes[0], idx, sides)

    expect(data.peak).toBe(8)
    expect(data.localAttachments.get("ab")).toMatchObject({ kind: "out", side: "top", value: 5 })
    expect(data.localAttachments.get("ac")).toMatchObject({ kind: "out", side: "bot", value: 3 })
    expect(data.samples[0].t).toBe(-1)
    expect(data.samples.every((s) => s.topMass >= 0 && s.botMass >= 0)).toBe(true)
  })
})

describe("band geometry helpers", () => {
  const xScale = (t: number) => t * 10

  it("clamps times and samples to an optional domain", () => {
    expect(clampTime(-5, [0, 10])).toBe(0)
    expect(clampTime(15, [0, 10])).toBe(10)
    expect(clampTime(6, undefined)).toBe(6)
    expect(clampSamples([{ t: -5, topMass: 1, botMass: 2 }], [0, 10])).toEqual([
      { t: 0, topMass: 1, botMass: 2 },
    ])
  })

  it("returns the correct y range for every attachment side/kind", () => {
    const base = { time: 0, sideMassBefore: 4, sideMassAfter: 6, value: 2 }
    expect(attachmentYRange({ ...base, kind: "out", side: "top" } as ProcessSankeyAttachment, 100, 10)).toEqual([60, 80])
    expect(attachmentYRange({ ...base, kind: "out", side: "bot" } as ProcessSankeyAttachment, 100, 10)).toEqual([120, 140])
    expect(attachmentYRange({ ...base, kind: "in", side: "top" } as ProcessSankeyAttachment, 100, 10)).toEqual([40, 60])
    expect(attachmentYRange({ ...base, kind: "in", side: "bot" } as ProcessSankeyAttachment, 100, 10)).toEqual([140, 160])
  })

  it("builds closed band paths and returns null for empty samples", () => {
    expect(buildBandPath([], 100, 10, xScale, [0, 10])).toBeNull()
    const path = buildBandPath([
      { t: -1, topMass: 1, botMass: 0 },
      { t: 5, topMass: 2, botMass: 3 },
      { t: 12, topMass: 1, botMass: 1 },
    ], 100, 10, xScale, [0, 10])
    expect(path).toBe("M0,90 L50,80 L100,90 L100,110 L50,130 L0,100 Z")
  })

  it("builds system-in and system-out gradient cutouts clipped to the band", () => {
    const nodes: ProcessSankeyNode[] = [{ id: "A" }, { id: "B" }]
    const edges: ProcessSankeyEdge[] = [
      { id: "ab", source: "A", target: "B", value: 2, startTime: 10, endTime: 20, systemInTime: 5, systemOutTime: 30 },
    ]
    const layout = computeProcessSankeyLayout(nodes, edges, {
      plotH: 200,
      pairing: "temporal",
      packing: "reuse",
      laneOrder: "insertion",
      lifetimeMode: "full",
    })

    const sourceStubs = buildBandCutoutsForNode("A", edges, layout, xScale, [0, 40])
    const targetStubs = buildBandCutoutsForNode("B", edges, layout, xScale, [0, 40])
    expect(sourceStubs).toHaveLength(1)
    expect(sourceStubs[0]).toMatchObject({ x0: 30, x1: 50, from: 0, to: 1 })
    expect(sourceStubs[0].pathD).toContain("L100")
    expect(targetStubs).toHaveLength(1)
    expect(targetStubs[0]).toMatchObject({ x0: 300, x1: 320, from: 1, to: 0 })
    expect(targetStubs[0].pathD).toContain("M200")
    expect(buildBandCutoutsForNode("missing", edges, layout, xScale, [0, 40])).toEqual([])
  })
})

describe("computeProcessSankeyLayout", () => {
  const opts: ProcessSankeyOptions = {
    plotH: 400,
    pairing: "temporal",
    packing: "reuse",
    laneOrder: "crossing-min",
    lifetimeMode: "half",
  }

  it("computes a layout for the canonical Alice→Eng→Release path", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "Alice", xExtent: [5, 5] },
      { id: "Eng" },
      { id: "Release" },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "alice-eng", source: "Alice", target: "Eng", value: 8, startTime: 10, endTime: 20 },
      { id: "eng-rel",   source: "Eng",   target: "Release", value: 8, startTime: 30, endTime: 40 },
    ]
    const layout = computeProcessSankeyLayout(nodes, edges, opts)
    expect(layout).toBeTruthy()
    expect(layout.centerlines).toHaveProperty("Alice")
    expect(layout.centerlines).toHaveProperty("Eng")
    expect(layout.centerlines).toHaveProperty("Release")
    expect(layout.valueScale).toBeGreaterThan(0)
    // Each node gets samples for its band geometry.
    expect(layout.nodeData.Alice.samples.length).toBeGreaterThan(0)
    expect(layout.nodeData.Eng.samples.length).toBeGreaterThan(0)
    expect(layout.nodeData.Release.samples.length).toBeGreaterThan(0)
  })

  it("extends a sink's band past the last edge when xExtent[1] is later", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "Src",  xExtent: [5, 5] },
      // xExtent[1] = 100 — well past the IN at t=20
      { id: "Sink", xExtent: [5, 100] },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "s-k", source: "Src", target: "Sink", value: 5, startTime: 10, endTime: 20 },
    ]
    const layout = computeProcessSankeyLayout(nodes, edges, opts)
    const sinkSamples = layout.nodeData.Sink.samples
    // Last sample's time should reach the explicit end (100), not stop at the IN time.
    expect(sinkSamples[sinkSamples.length - 1].t).toBe(100)
    // Lane lifetime tracks the explicit end too.
    expect(layout.laneLifetime.Sink.end).toBe(100)
  })

  it("opens the lane before the first edge when xExtent[0] is earlier", () => {
    const nodes: ProcessSankeyNode[] = [
      // xExtent[0] = 0 — earlier than first edge (t=10).
      { id: "Src",  xExtent: [0, 5] },
      { id: "Sink" },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "s-k", source: "Src", target: "Sink", value: 5, startTime: 10, endTime: 20 },
    ]
    const layout = computeProcessSankeyLayout(nodes, edges, opts)
    expect(layout.laneLifetime.Src.start).toBe(0)
  })

  it("packs depth-disjoint nodes into the same slot when packing=reuse", () => {
    // A's lane closes well before B's opens (lifetimes disjoint),
    // and both sit at the same topological depth (sources of Sink),
    // so reuse packing should merge them into a single slot.
    const nodes: ProcessSankeyNode[] = [
      { id: "A",    xExtent: [0,  10] },
      { id: "B",    xExtent: [50, 60] },
      { id: "Sink" },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "a-k", source: "A", target: "Sink", value: 3, startTime: 5,  endTime: 10 },
      { id: "b-k", source: "B", target: "Sink", value: 3, startTime: 55, endTime: 60 },
    ]
    const layout = computeProcessSankeyLayout(nodes, edges, opts)
    expect(layout.slots.length).toBe(2)
    expect(layout.slotByNode.A).toBe(layout.slotByNode.B)
  })

  it("packs every node in its own slot when packing=off", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "A",    xExtent: [0,  10] },
      { id: "B",    xExtent: [50, 60] },
      { id: "Sink" },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "a-k", source: "A", target: "Sink", value: 3, startTime: 5,  endTime: 10 },
      { id: "b-k", source: "B", target: "Sink", value: 3, startTime: 55, endTime: 60 },
    ]
    const layout = computeProcessSankeyLayout(nodes, edges, { ...opts, packing: "off" })
    expect(layout.slots.length).toBe(3)
    expect(layout.slotByNode.A).not.toBe(layout.slotByNode.B)
  })

  it("emits crossings/length quality metrics", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "A", xExtent: [0, 0] },
      { id: "B", xExtent: [0, 0] },
      { id: "X" }, { id: "Y" },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "ay", source: "A", target: "Y", value: 4, startTime: 5,  endTime: 10 },
      { id: "bx", source: "B", target: "X", value: 4, startTime: 5,  endTime: 10 },
    ]
    const layout = computeProcessSankeyLayout(nodes, edges, opts)
    expect(typeof layout.crossingsBefore === "number" || layout.crossingsBefore === null).toBe(true)
    expect(typeof layout.crossingsAfter === "number" || layout.crossingsAfter === null).toBe(true)
    expect(typeof layout.lengthBefore === "number" || layout.lengthBefore === null).toBe(true)
    expect(typeof layout.lengthAfter === "number" || layout.lengthAfter === null).toBe(true)
  })

  it("extends lane lifetime + target band when systemOutTime > endTime", () => {
    // systemOutTime > endTime: the target node's lane (and band's
    // right edge) extends out to the latest systemOutTime so the
    // per-edge fade-out cutouts have surface to render onto. The
    // mass profile WITHIN [endTime] stays byte-identical to the
    // un-hinted case — only the trailing mass is replayed forward.
    const nodes: ProcessSankeyNode[] = [{ id: "A" }, { id: "B" }]
    const edgesPlain: ProcessSankeyEdge[] = [
      { id: "e1", source: "A", target: "B", value: 1, startTime: 2, endTime: 3 },
      { id: "e2", source: "A", target: "B", value: 1, startTime: 4, endTime: 5 },
    ]
    const edgesWithHints: ProcessSankeyEdge[] = [
      { id: "e1", source: "A", target: "B", value: 1, startTime: 2, endTime: 3, systemInTime: 0.5, systemOutTime: 6 },
      { id: "e2", source: "A", target: "B", value: 1, startTime: 4, endTime: 5, systemInTime: 1.5, systemOutTime: 7 },
    ]
    const plain = computeProcessSankeyLayout(nodes, edgesPlain, opts)
    const hinted = computeProcessSankeyLayout(nodes, edgesWithHints, opts)
    expect(hinted.nodeData.A.peak).toBe(plain.nodeData.A.peak)
    expect(hinted.nodeData.B.peak).toBe(plain.nodeData.B.peak)
    expect(hinted.nodeData.A.topPeak).toBe(plain.nodeData.A.topPeak)
    expect(hinted.nodeData.B.topPeak).toBe(plain.nodeData.B.topPeak)
    // Lane lifetime extends to include systemIn (source) / systemOut (target).
    expect(hinted.laneLifetime.A.start).toBeLessThanOrEqual(0.5)
    expect(hinted.laneLifetime.B.end).toBeGreaterThanOrEqual(7)
    // Target samples reach the latest systemOutTime so the rightmost
    // fade-out cutout has a rect to paint onto.
    expect(Math.max(...hinted.nodeData.B.samples.map((s) => s.t))).toBeGreaterThanOrEqual(7)
    // Mass profile within the natural range is unchanged.
    const bPlainInside = plain.nodeData.B.samples.filter((s) => s.t >= 3 && s.t <= 5)
    const bHintedInside = hinted.nodeData.B.samples.filter((s) => s.t >= 3 && s.t <= 5)
    expect(bHintedInside).toEqual(bPlainInside)
  })
})

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
      { id: "e1", source: "A", target: "D", value: 1, startTime: 0, endTime: 10 },
      { id: "e2", source: "B", target: "C", value: 1, startTime: 0, endTime: 10 },
    ]
    expect(countCrossings(slots, edges)).toBe(1)
  })

  it("counts zero when the bands run parallel", () => {
    // A(0)→C(2) and B(1)→D(3): order preserved on both ends → no crossing.
    const slots = { A: 0, B: 1, C: 2, D: 3 }
    const edges: ProcessSankeyEdge[] = [
      { id: "e1", source: "A", target: "C", value: 1, startTime: 0, endTime: 10 },
      { id: "e2", source: "B", target: "D", value: 1, startTime: 0, endTime: 10 },
    ]
    expect(countCrossings(slots, edges)).toBe(0)
  })

  it("ignores edge pairs that share an endpoint", () => {
    // A→D and A→C share source A — they fan out, never counted as a crossing.
    const slots = { A: 0, C: 2, D: 3 }
    const edges: ProcessSankeyEdge[] = [
      { id: "e1", source: "A", target: "D", value: 1, startTime: 0, endTime: 10 },
      { id: "e2", source: "A", target: "C", value: 1, startTime: 0, endTime: 10 },
    ]
    expect(countCrossings(slots, edges)).toBe(0)
  })

  it("ignores geometrically-crossing edges that are disjoint in time", () => {
    // Same inverting slots as the first case, but the time windows don't
    // overlap — temporally-separate flows can reuse a lane without crossing.
    const slots = { A: 0, B: 1, C: 2, D: 3 }
    const edges: ProcessSankeyEdge[] = [
      { id: "e1", source: "A", target: "D", value: 1, startTime: 0, endTime: 10 },
      { id: "e2", source: "B", target: "C", value: 1, startTime: 20, endTime: 30 },
    ]
    expect(countCrossings(slots, edges)).toBe(0)
  })
})

describe("totalEdgeLength", () => {
  it("sums |slot distance| weighted by edge value", () => {
    const slots = { A: 0, B: 2, C: 5 }
    const edges: ProcessSankeyEdge[] = [
      { id: "ab", source: "A", target: "B", value: 3, startTime: 0, endTime: 10 }, // |0-2|*3 = 6
      { id: "bc", source: "B", target: "C", value: 2, startTime: 0, endTime: 10 }, // |2-5|*2 = 6
    ]
    expect(totalEdgeLength(slots, edges)).toBe(12)
  })

  it("treats a zero/absent value as 1", () => {
    const slots = { A: 0, B: 4 }
    const edges: ProcessSankeyEdge[] = [
      { id: "ab", source: "A", target: "B", value: 0, startTime: 0, endTime: 10 }, // |0-4|*1 = 4
    ]
    expect(totalEdgeLength(slots, edges)).toBe(4)
  })
})

describe("computeProcessSankeyLayout — laneOrder variants", () => {
  // A multi-flow graph with cross-connections (ae, cd) so lane ordering has
  // real choices to make. The existing suite only ever ran "crossing-min".
  const nodes: ProcessSankeyNode[] = [
    { id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }, { id: "F" },
  ]
  const edges: ProcessSankeyEdge[] = [
    { id: "ad", source: "A", target: "D", value: 5, startTime: 10, endTime: 30 },
    { id: "be", source: "B", target: "E", value: 5, startTime: 10, endTime: 30 },
    { id: "cf", source: "C", target: "F", value: 5, startTime: 10, endTime: 30 },
    { id: "ae", source: "A", target: "E", value: 3, startTime: 12, endTime: 28 },
    { id: "cd", source: "C", target: "D", value: 3, startTime: 12, endTime: 28 },
  ]
  const base = {
    plotH: 400,
    pairing: "temporal" as const,
    packing: "reuse" as const,
    lifetimeMode: "half" as const,
  }
  const LANE_ORDERS = ["insertion", "crossing-min", "inside-out", "crossing-min+inside-out"] as const

  for (const laneOrder of LANE_ORDERS) {
    it(`produces a valid layout for laneOrder="${laneOrder}"`, () => {
      const layout = computeProcessSankeyLayout(nodes, edges, { ...base, laneOrder })
      expect(layout).toBeTruthy()
      for (const n of nodes) {
        expect(layout.centerlines).toHaveProperty(n.id)
      }
      expect(layout.crossingsAfter === null || Number.isFinite(layout.crossingsAfter)).toBe(true)
    })
  }

  it("crossing-minimizing lane orders never increase crossings vs. the initial order", () => {
    for (const laneOrder of ["crossing-min", "crossing-min+inside-out"] as const) {
      const layout = computeProcessSankeyLayout(nodes, edges, { ...base, laneOrder })
      if (layout.crossingsBefore != null && layout.crossingsAfter != null) {
        expect(layout.crossingsAfter).toBeLessThanOrEqual(layout.crossingsBefore)
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
        endTime: 20,
      })
    }
    const layout = computeProcessSankeyLayout(largeNodes, largeEdges, {
      ...base,
      packing: "off",
      laneOrder: "crossing-min",
    })

    expect(layout.slots.length).toBe(18)
    expect(layout.crossingsBefore).not.toBeNull()
    expect(layout.crossingsAfter).not.toBeNull()
    expect(layout.lengthAfter).not.toBeNull()
  })
})
