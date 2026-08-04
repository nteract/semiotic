import { describe, it, expect } from "vitest"
import {
  validateProcessSankey,
  partitionProcessSankeyIssues,
  computeProcessSankeyLayout,
  buildEdgeIndex,
  assignSides,
  assignSameSlotHandoffSides,
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
import { resolveProcessSankeyMarginDefaults } from "./frameMargins"
import { slotStableId } from "./layoutGeometry"

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

  it("allows zero-duration edges (instantaneous events)", () => {
    const issues = validateProcessSankey(
      [{ id: "A" }, { id: "B" }],
      [{ id: "e", source: "A", target: "B", value: 1, startTime: 50, endTime: 50 }],
      dom,
    )
    expect(issues.filter((i) => i.kind === "backward-edge")).toEqual([])
  })

  it("flags true reverse-time edges as fatal", () => {
    const issues = validateProcessSankey(
      [{ id: "A" }, { id: "B" }],
      [{ id: "e", source: "A", target: "B", value: 1, startTime: 60, endTime: 40 }],
      dom,
    )
    expect(issues.some((i) => i.kind === "backward-edge")).toBe(true)
    const { fatal } = partitionProcessSankeyIssues(issues)
    expect(fatal.some((i) => i.kind === "backward-edge")).toBe(true)
  })

  it("treats duplicate ids as fatal under the default static policy", () => {
    const issues = validateProcessSankey(
      [{ id: "A" }, { id: "A" }],
      [{ id: "e", source: "A", target: "A", value: 1, startTime: 10, endTime: 20 }],
      dom,
    )
    const { fatal, warnings } = partitionProcessSankeyIssues(issues)
    // Default usageMode is static/mcp: duplicate ids are fatal so SSR/MCP
    // snapshots never silently double-count. Push mode keeps them as warnings.
    expect(fatal.some((i) => i.kind === "duplicate-node")).toBe(true)
    expect(warnings.some((i) => i.kind === "duplicate-node")).toBe(false)
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

  it("holds an instantaneous same-stage peak across an authored extent when max sizing is requested", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "Earlier" }, { id: "Same-stage" }, { id: "Stage", xExtent: [1, 2] }, { id: "Next" },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "earlier-stage", source: "Earlier", target: "Stage", value: 35, startTime: 0, endTime: 1 },
      { id: "same-stage", source: "Same-stage", target: "Stage", value: 7, startTime: 2, endTime: 2 },
      { id: "stage-next", source: "Stage", target: "Next", value: 42, startTime: 2, endTime: 3 },
    ]
    const index = buildEdgeIndex(nodes, edges)
    const sides = new Map([
      ["earlier-stage", { targetSide: "top" as const }],
      ["same-stage", { targetSide: "top" as const }],
      ["stage-next", { sourceSide: "top" as const }],
    ])

    const temporal = computeNode(nodes[2], index, sides)
    const staged = computeNode(nodes[2], index, sides, undefined, "max")

    expect(Math.max(...temporal.samples.filter((sample) => sample.t < 2)
      .map((sample) => sample.topMass + sample.botMass))).toBe(35)
    expect(staged.samples).toEqual([
      { t: 1, topMass: 42, botMass: 0 },
      { t: 2, topMass: 42, botMass: 0 },
    ])
    // The option is strictly visual: event/ribbon attachment accounting stays exact.
    expect(staged.localAttachments.get("stage-next")).toMatchObject({
      time: 2, sideMassBefore: 42, sideMassAfter: 0,
    })
  })

  it("anchors synthesized side transfers at departure without creating a floating band island", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "Top" }, { id: "Bottom" }, { id: "Eng" }, { id: "Release" },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "top-eng", source: "Top", target: "Eng", value: 5, startTime: 0, endTime: 10 },
      { id: "bottom-eng", source: "Bottom", target: "Eng", value: 8, startTime: 0, endTime: 10 },
      { id: "eng-release-8", source: "Eng", target: "Release", value: 8, startTime: 20, endTime: 40 },
      { id: "eng-release-5", source: "Eng", target: "Release", value: 5, startTime: 30, endTime: 45 },
    ]
    const edgeIndex = buildEdgeIndex(nodes, edges)
    const sides = new Map([
      ["top-eng", { targetSide: "top" as const }],
      ["bottom-eng", { targetSide: "bot" as const }],
      ["eng-release-8", { sourceSide: "bot" as const }],
      ["eng-release-5", { sourceSide: "bot" as const }],
    ])

    const data = computeNode(nodes[2], edgeIndex, sides)
    const sampleTimes = new Set(data.samples.map((sample) => sample.t))

    expect(sampleTimes.has(25)).toBe(false)
    expect([...sampleTimes].every((time) => [10, 20, 30].includes(time))).toBe(true)
    expect(data.localAttachments.get("eng-release-8")?.sideMassBefore).toBe(8)
    expect(data.localAttachments.get("eng-release-5")?.sideMassBefore).toBe(5)
    expect(data.samples.every((sample) => sample.topMass >= 0 && sample.botMass >= 0)).toBe(true)
  })

  it("does not translate an arrival band to prepare a future departure", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "Input" }, { id: "Stage" }, { id: "Output" },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "input-stage", source: "Input", target: "Stage", value: 13, startTime: 0, endTime: 10 },
      { id: "stage-output", source: "Stage", target: "Output", value: 13, startTime: 20, endTime: 30 },
    ]
    const edgeIndex = buildEdgeIndex(nodes, edges)
    const sides = new Map([
      ["input-stage", { targetSide: "top" as const }],
      ["stage-output", { sourceSide: "bot" as const }],
    ])

    const data = computeNode(nodes[1], edgeIndex, sides)
    const settledArrival = data.samples.filter((sample) => sample.t === 10).at(-1)
    const preparedDeparture = data.samples.filter((sample) => sample.t === 20)

    expect(settledArrival).toMatchObject({ topMass: 13, botMass: 0 })
    expect(preparedDeparture).toEqual(expect.arrayContaining([
      expect.objectContaining({ t: 20, topMass: 0, botMass: 13 }),
    ]))
    expect(data.localAttachments.get("stage-output")).toMatchObject({
      side: "bot",
      sideMassBefore: 13,
      boundaryOffset: -13,
    })
    const departureRange = attachmentYRange(
      data.localAttachments.get("stage-output")!,
      100,
      2,
    )
    expect(departureRange).toEqual([74, 100])
    expect(data.samples.every((sample) => sample.topMass >= 0 && sample.botMass >= 0)).toBe(true)
  })

  it("assigns same-row handoffs to the side that holds their visible mass", () => {
    const edges: ProcessSankeyEdge[] = [
      { id: "alice-eng", source: "Alice", target: "Eng", value: 8, startTime: 0, endTime: 10 },
      { id: "bob-eng", source: "Bob", target: "Eng", value: 5, startTime: 0, endTime: 15 },
      { id: "eng-release-8", source: "Eng", target: "Release", value: 8, startTime: 20, endTime: 30 },
      { id: "eng-release-5", source: "Eng", target: "Release", value: 5, startTime: 25, endTime: 35 },
    ]
    const sides = new Map([
      ["alice-eng", { targetSide: "top" as const }],
      ["bob-eng", { targetSide: "bot" as const }],
      ["eng-release-8", { sourceSide: "bot" as const, targetSide: "bot" as const }],
      ["eng-release-5", { sourceSide: "bot" as const, targetSide: "bot" as const }],
    ])

    assignSameSlotHandoffSides(edges, sides, {
      Alice: 0, Bob: 2, Eng: 1, Release: 1,
    })

    expect(sides.get("eng-release-8")).toMatchObject({ sourceSide: "top", targetSide: "top" })
    expect(sides.get("eng-release-5")).toMatchObject({ sourceSide: "bot", targetSide: "bot" })
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
    const projectedSourceStubs = buildBandCutoutsForNode(
      "A", edges, layout, xScale, [0, 40], new Map([["ab", 9.5]]),
    )
    expect(projectedSourceStubs[0].pathD).toContain("L95")
    expect(projectedSourceStubs[0].pathD).not.toContain("L100")
    expect(targetStubs).toHaveLength(1)
    expect(targetStubs[0]).toMatchObject({ x0: 300, x1: 320, from: 1, to: 0 })
    expect(targetStubs[0].pathD).toContain("M200")
    expect(buildBandCutoutsForNode("missing", edges, layout, xScale, [0, 40])).toEqual([])
  })

  it("moves a pre-domain system-in fade inside the visible boundary", () => {
    const nodes: ProcessSankeyNode[] = [{ id: "Inherited source" }, { id: "Main" }]
    const edge: ProcessSankeyEdge = {
      id: "inherited-main",
      source: "Inherited source",
      target: "Main",
      value: 1,
      startTime: 10,
      endTime: 20,
      systemInTime: -5,
    }
    const layout = computeProcessSankeyLayout(nodes, [edge], {
      plotH: 200,
      pairing: "temporal",
      packing: "reuse",
      laneOrder: "insertion",
      lifetimeMode: "full",
    })

    const [stub] = buildBandCutoutsForNode(
      "Inherited source", [edge], layout, xScale, [0, 40],
    )

    // An entity known only to predate the dataset should blur into the chart:
    // transparent at the boundary, fully colored 20 screen pixels inside it.
    expect(stub).toMatchObject({ x0: 0, x1: 20, from: 0, to: 1 })
    expect(stub.pathD).toContain("M0")
    expect(stub.pathD).toContain("L100")
    // The lifecycle hint is render-only; the authored transfer remains dated.
    expect(edge.startTime).toBe(10)
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

  it("places a multi-slot bonded feeder block in line with its exclusive ungrouped sink", () => {
    // Generic process-river pattern: simultaneous bonded sources hand off into
    // one long-lived sink. Packing co-locates one feeder with the sink; ordering
    // keeps the rest of the block contiguous around it instead of parking the
    // bond in a far lane while unrelated packs sit between.
    const nodes: ProcessSankeyNode[] = [
      { id: "Red", group: "founding", xExtent: [0, 10] },
      { id: "White", group: "founding", xExtent: [0, 10] },
      { id: "Blue", group: "founding", xExtent: [0, 10] },
      { id: "States", xExtent: [10, 40] },
      { id: "NoiseA", xExtent: [12, 20] },
      { id: "NoiseB", xExtent: [22, 30] },
      { id: "NoiseC", xExtent: [32, 38] },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "r", source: "Red", target: "States", value: 4, startTime: 10, endTime: 12 },
      { id: "w", source: "White", target: "States", value: 4, startTime: 10, endTime: 12 },
      { id: "b", source: "Blue", target: "States", value: 5, startTime: 10, endTime: 12 },
      { id: "na", source: "NoiseA", target: "States", value: 1, startTime: 20, endTime: 22 },
      { id: "nb", source: "NoiseB", target: "States", value: 1, startTime: 30, endTime: 32 },
      { id: "nc", source: "NoiseC", target: "States", value: 1, startTime: 38, endTime: 40 },
    ]
    const layout = computeProcessSankeyLayout(nodes, edges, {
      ...opts,
      laneOrder: "crossing-min+inside-out",
      lifetimeMode: "full",
    })
    const foundingSlots = ["Red", "White", "Blue"].map((id) => layout.slotByNode[id])
    const states = layout.slotByNode.States
    const fMin = Math.min(...foundingSlots)
    const fMax = Math.max(...foundingSlots)
    expect(fMax - fMin).toBe(2)
    expect(foundingSlots).toContain(states)
    expect(states).toBeGreaterThanOrEqual(fMin)
    expect(states).toBeLessThanOrEqual(fMax)
    for (const id of ["Red", "White", "Blue"]) {
      expect(Math.abs(layout.slotByNode[id] - states)).toBeLessThanOrEqual(2)
    }
  })

  it("keeps a shared node group contiguous and removes its internal gutters", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "A-states-before", group: "united-states", xExtent: [0, 2] },
      { id: "A-states-after", group: "united-states", xExtent: [8, 10] },
      { id: "B-foreign-before", xExtent: [0, 2] },
      { id: "B-foreign-after", xExtent: [8, 10] },
      { id: "C-territories-before", group: "united-states", xExtent: [0, 2] },
      { id: "C-territories-after", group: "united-states", xExtent: [8, 10] },
      { id: "D-foreign-before", xExtent: [0, 2] },
      { id: "D-foreign-after", xExtent: [8, 10] },
      { id: "E-occupied-before", group: "united-states", xExtent: [0, 2] },
      { id: "E-occupied-after", group: "united-states", xExtent: [8, 10] },
    ]
    const edges: ProcessSankeyEdge[] = [
      { id: "states", source: "A-states-before", target: "A-states-after", value: 3, startTime: 2, endTime: 8 },
      { id: "foreign-1", source: "B-foreign-before", target: "B-foreign-after", value: 2, startTime: 2, endTime: 8 },
      { id: "territories", source: "C-territories-before", target: "C-territories-after", value: 2, startTime: 2, endTime: 8 },
      { id: "foreign-2", source: "D-foreign-before", target: "D-foreign-after", value: 2, startTime: 2, endTime: 8 },
      { id: "occupied", source: "E-occupied-before", target: "E-occupied-after", value: 1, startTime: 2, endTime: 8 },
    ]

    const layout = computeProcessSankeyLayout(nodes, edges, {
      ...opts,
      laneOrder: "insertion",
      lifetimeMode: "full",
    })
    const groupedSlots = [...new Set(nodes
      .filter((node) => node.group === "united-states")
      .map((node) => layout.slotByNode[node.id]))].sort((a, b) => a - b)

    expect(groupedSlots).toHaveLength(3)
    expect(groupedSlots.at(-1)! - groupedSlots[0]).toBe(groupedSlots.length - 1)
    for (let index = 1; index < groupedSlots.length; index += 1) {
      const upper = layout.slots[groupedSlots[index - 1]].occupants
        .find((occupant) => occupant.id.endsWith("before"))!
      const lower = layout.slots[groupedSlots[index]].occupants
        .find((occupant) => occupant.id.endsWith("before"))!
      const upperData = layout.nodeData[upper.id]
      const lowerData = layout.nodeData[lower.id]
      const upperBottom = layout.centerlines[upper.id] + upperData.botPeak * layout.valueScale
      const lowerTop = layout.centerlines[lower.id] - lowerData.topPeak * layout.valueScale
      expect(lowerTop).toBeCloseTo(upperBottom, 6)
    }

    const padded = computeProcessSankeyLayout(nodes, edges, {
      ...opts,
      laneOrder: "insertion",
      lifetimeMode: "full",
      groupPadding: 4,
    })
    const activeRanges = nodes
      .filter((node) => node.group === "united-states" && node.id.endsWith("before"))
      .map((node) => {
        const sample = padded.nodeData[node.id].samples
          .filter((candidate) => candidate.t <= 1)
          .at(-1)!
        const boundary = padded.centerlines[node.id] +
          (sample.boundaryOffset ?? 0) * padded.valueScale
        return [
          boundary - sample.topMass * padded.valueScale,
          boundary + sample.botMass * padded.valueScale,
        ]
      })
      .sort((a, b) => a[0] - b[0])
    for (let index = 1; index < activeRanges.length; index += 1) {
      expect(activeRanges[index][0] - activeRanges[index - 1][1]).toBeCloseTo(4, 6)
    }
  })

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

  it("uses the minimum occupied-band row count and favors a straight handoff", () => {
    // Two rows are sufficient. Of the valid two-row colorings, putting A and
    // Sink together keeps their connected handoff straight; the old packer
    // chose rows only from topological depth and outer lifetime bounds.
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
    expect(layout.slotByNode.A).toBe(layout.slotByNode.Sink)
    expect(layout.slotByNode.B).not.toBe(layout.slotByNode.Sink)
  })

  it("reuses occupied-band rows across aggregate transition envelopes", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "Launch", xExtent: [0, 0] },
      { id: "Orbit" },
      { id: "Lifeboat" },
      { id: "Recovery" },
      { id: "Return" },
    ]
    const edges: ProcessSankeyEdge[] = [
      // Fast and slow arrivals make the old half-edge envelopes overlap:
      // Launch ended at 15 while Orbit began at 5. The node bands themselves
      // still hand off cleanly at T+0 → T+10.
      { id: "fast", source: "Launch", target: "Orbit", value: 9, startTime: 0, endTime: 10 },
      { id: "slow", source: "Launch", target: "Orbit", value: 9, startTime: 0, endTime: 30 },
      { id: "abort", source: "Launch", target: "Lifeboat", value: 1, startTime: 0, endTime: 20 },
      { id: "rescue", source: "Lifeboat", target: "Recovery", value: 1, startTime: 25, endTime: 35 },
      { id: "home", source: "Orbit", target: "Return", value: 18, startTime: 40, endTime: 50 },
    ]

    const layout = computeProcessSankeyLayout(nodes, edges, opts)

    expect(layout.slots).toHaveLength(2)
    expect(layout.slotByNode.Launch).toBe(layout.slotByNode.Orbit)
    expect(layout.slotByNode.Lifeboat).toBe(layout.slotByNode.Recovery)
    expect(layout.slotByNode.Orbit).not.toBe(layout.slotByNode.Recovery)
  })

  it("uses the resolved far-end order to break equal-time attachment ties", () => {
    const nodes: ProcessSankeyNode[] = [
      { id: "Launch", xExtent: [0, 0] },
      { id: "Orbit" },
    ]
    const midpoint = (
      layout: ReturnType<typeof computeProcessSankeyLayout>,
      edge: ProcessSankeyEdge,
      endpoint: "source" | "target",
    ) => {
      const nodeId = edge[endpoint]
      const attachment = layout.nodeData[nodeId].localAttachments.get(edge.id)!
      const range = attachmentYRange(
        attachment, layout.centerlines[nodeId], layout.valueScale,
      )
      return (range[0] + range[1]) / 2
    }

    const sameStart: ProcessSankeyEdge[] = [
      { id: "a-late", source: "Launch", target: "Orbit", value: 1, startTime: 0, endTime: 30 },
      { id: "b-early", source: "Launch", target: "Orbit", value: 1, startTime: 0, endTime: 10 },
      { id: "c-middle", source: "Launch", target: "Orbit", value: 1, startTime: 0, endTime: 20 },
    ]
    const departureLayout = computeProcessSankeyLayout(nodes, sameStart, {
      ...opts, laneOrder: "insertion",
    })
    for (const edge of sameStart) {
      expect(midpoint(departureLayout, edge, "source"))
        .toBeCloseTo(midpoint(departureLayout, edge, "target"))
    }

    const sameEnd: ProcessSankeyEdge[] = [
      { id: "a-late", source: "Launch", target: "Orbit", value: 1, startTime: 30, endTime: 40 },
      { id: "b-early", source: "Launch", target: "Orbit", value: 1, startTime: 10, endTime: 40 },
      { id: "c-middle", source: "Launch", target: "Orbit", value: 1, startTime: 20, endTime: 40 },
    ]
    const arrivalLayout = computeProcessSankeyLayout(nodes, sameEnd, {
      ...opts, laneOrder: "insertion",
    })
    for (const edge of sameEnd) {
      expect(midpoint(arrivalLayout, edge, "source"))
        .toBeCloseTo(midpoint(arrivalLayout, edge, "target"))
    }
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

  it("keeps packing assignment stable across multi-pass side recompute", () => {
    const layout = computeProcessSankeyLayout(nodes, edges, {
      plotH: 400,
      packing: "reuse",
      laneOrder: "crossing-min",
      lifetimeMode: "half",
      pairing: "temporal",
    })
    // Occupant membership is frozen after the first pack; slot stable ids
    // must be fully ranked (no Infinity fallback to lexicographic order).
    const ids = layout.slots.map(slotStableId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.keys(layout.slotByNode).sort()).toEqual(
      nodes.map((n) => n.id).sort(),
    )
  })

  it("preserves packing membership when plot height changes (scale-only reflow)", () => {
    const opts = {
      packing: "reuse" as const,
      laneOrder: "crossing-min" as const,
      lifetimeMode: "half" as const,
      pairing: "temporal" as const,
    }
    const tall = computeProcessSankeyLayout(nodes, edges, { ...opts, plotH: 900 })
    const short = computeProcessSankeyLayout(nodes, edges, { ...opts, plotH: 320 })
    expect(short.slots.map(slotStableId)).toEqual(tall.slots.map(slotStableId))
    expect(short.slotByNode).toEqual(tall.slotByNode)
  })

  it("layouts zero-duration edges without throwing", () => {
    const layout = computeProcessSankeyLayout(
      [{ id: "A" }, { id: "B" }],
      [{ id: "e", source: "A", target: "B", value: 2, startTime: 50, endTime: 50 }],
      { plotH: 200, packing: "off", laneOrder: "insertion" },
    )
    expect(layout.slots.length).toBeGreaterThan(0)
    expect(layout.nodeData.A).toBeDefined()
    expect(layout.nodeData.B).toBeDefined()
  })
})

describe("ProcessSankey public defaults alignment", () => {
  it("assignSides defaults to temporal pairing", () => {
    const nodes: ProcessSankeyNode[] = [{ id: "Hub" }, { id: "Early" }, { id: "Late" }]
    const edges: ProcessSankeyEdge[] = [
      { id: "e-late", source: "Late", target: "Hub", value: 1, startTime: 30, endTime: 40 },
      { id: "e-early", source: "Early", target: "Hub", value: 10, startTime: 10, endTime: 20 },
    ]
    const index = buildEdgeIndex(nodes, edges)
    // Default (omitted pairing) must match explicit temporal.
    const def = assignSides(nodes, edges, index)
    const temporal = assignSides(nodes, edges, index, "temporal")
    expect([...def.entries()]).toEqual([...temporal.entries()])
  })

  it("margin defaults use 80px horizontal gutters for CSR/SSR parity", () => {
    const m = resolveProcessSankeyMarginDefaults(false, false, false, "horizontal")
    expect(m.left).toBe(80)
    expect(m.right).toBe(80)
    expect(m.top).toBe(8)
  })
})
