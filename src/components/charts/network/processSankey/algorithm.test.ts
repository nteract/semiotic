import { describe, it, expect } from "vitest"
import {
  validateProcessSankey,
  computeProcessSankeyLayout,
  buildEdgeIndex,
  formatProcessSankeyIssue,
  type ProcessSankeyNode,
  type ProcessSankeyEdge,
  type ProcessSankeyOptions,
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
