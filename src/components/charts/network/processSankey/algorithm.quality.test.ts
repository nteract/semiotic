import { describe, expect, it } from "vitest"
import {
  computeProcessSankeyLayout,
  countCrossings,
  validateProcessSankey,
  type ProcessSankeyEdge,
  type ProcessSankeyLayoutQuality,
  type ProcessSankeyNode,
  type ProcessSankeyOptions,
} from "./algorithm"
import { acceptsBoundaryHubCandidate } from "./boundaryHubOrdering"
import {
  processHospitalFixture,
  processLineageFixture,
  processOrderingStressFixture,
} from "./fixtures"

const baseOptions: ProcessSankeyOptions = {
  plotH: 400,
  packing: "off",
  laneOrder: "crossing-min",
  lifetimeMode: "full",
  domain: [0, 100],
}

function rounded(quality: ProcessSankeyLayoutQuality): ProcessSankeyLayoutQuality {
  return Object.fromEntries(
    Object.entries(quality).map(([key, value]) => [key, Math.round(value * 1000) / 1000]),
  ) as unknown as ProcessSankeyLayoutQuality
}

/**
 * Four simultaneous dummy arrivals establish the seven-row chromatic bound.
 * Later source pairs are disjoint in time, so a destination-aware large-graph
 * refinement can put the S feeders in rows near S and the C feeders in the
 * otherwise-idle rows near C without buying another row.
 */
function destinationCoherenceFixture(): {
  nodes: ProcessSankeyNode[]
  edges: ProcessSankeyEdge[]
} {
  const nodes: ProcessSankeyNode[] = ["S", "T", "C"].map((id) => ({
    id,
    xExtent: [1, 100],
  }))
  const edges: ProcessSankeyEdge[] = []

  for (const id of ["S", "T", "C"]) {
    nodes.push({ id: `I${id}`, xExtent: [0, 0] })
    edges.push({
      id: `init-${id}`,
      source: `I${id}`,
      target: id,
      value: 5,
      startTime: 0,
      endTime: 1,
    })
  }

  for (let index = 1; index <= 4; index += 1) {
    const id = `D${index}`
    nodes.push({ id, xExtent: [5, 10] })
    edges.push({
      id: `${id}-T`,
      source: id,
      target: "T",
      value: 1,
      startTime: 10,
      endTime: 11,
    })
  }

  for (const [target, time, value, ids] of [
    ["S", 20, 10, ["S1", "S2"]],
    ["C", 50, 1, ["P1", "P2"]],
  ] as const) {
    for (const id of ids) {
      nodes.push({ id, xExtent: [time - 5, time] })
      edges.push({
        id: `${id}-${target}`,
        source: id,
        target,
        value,
        startTime: time,
        endTime: time + 1,
      })
    }
  }

  return { nodes, edges }
}

function strictlyBetween(value: number, first: number, second: number): boolean {
  return value > Math.min(first, second) + 1e-6 &&
    value < Math.max(first, second) - 1e-6
}

describe("ProcessSankey layout quality corpus", () => {
  it("pins the lineage/repartition fixture baseline", () => {
    const layout = computeProcessSankeyLayout(
      processLineageFixture.nodes,
      processLineageFixture.edges,
      baseOptions,
    )
    expect({
      before: rounded(layout.layoutQualityBefore),
      after: rounded(layout.layoutQuality),
    }).toEqual({
      before: {
        crossings: 0,
        weightedLength: 90,
        pixelLength: 4554.872,
        transitOcclusion: 0,
        verticalUtilization: 0.94,
      },
      after: {
        crossings: 0,
        weightedLength: 85,
        pixelLength: 4351.282,
        transitOcclusion: 0,
        verticalUtilization: 0.94,
      },
    })
  })

  it("pins the wide hospital-flow baseline and reduces long-transit occlusion", () => {
    const layout = computeProcessSankeyLayout(
      processHospitalFixture.nodes,
      processHospitalFixture.edges,
      baseOptions,
    )
    expect({
      before: rounded(layout.layoutQualityBefore),
      after: rounded(layout.layoutQuality),
    }).toEqual({
      before: {
        crossings: 20,
        weightedLength: 572,
        pixelLength: 19038.381,
        transitOcclusion: 5.065,
        verticalUtilization: 0.949,
      },
      after: {
        crossings: 5,
        weightedLength: 352,
        pixelLength: 12436.11,
        transitOcclusion: 1.383,
        verticalUtilization: 0.946,
      },
    })
    // Ordering must still cut the packing-seed crossing count substantially.
    expect(layout.layoutQuality.crossings)
      .toBeLessThan(layout.layoutQualityBefore.crossings / 2)
    expect(layout.layoutQuality.transitOcclusion)
      .toBeLessThan(layout.layoutQualityBefore.transitOcclusion)
    expect(layout.layoutQuality.transitOcclusion)
      .toBeLessThan(layout.layoutQualityBefore.transitOcclusion)
  })

  it("is deeply deterministic across complete repeated runs", () => {
    const first = computeProcessSankeyLayout(
      processHospitalFixture.nodes,
      processHospitalFixture.edges,
      baseOptions,
    )
    const second = computeProcessSankeyLayout(
      processHospitalFixture.nodes,
      processHospitalFixture.edges,
      baseOptions,
    )
    expect(second).toEqual(first)
  })

  it("keeps every reported metric finite on the corpus", () => {
    for (const fixture of [processLineageFixture, processHospitalFixture]) {
      const layout = computeProcessSankeyLayout(fixture.nodes, fixture.edges, baseOptions)
      expect(Object.values(layout.layoutQuality).every(Number.isFinite)).toBe(true)
      expect(layout.layoutQuality.verticalUtilization).toBeGreaterThanOrEqual(0)
      expect(layout.layoutQuality.verticalUtilization).toBeLessThanOrEqual(1)
    }
  })
})

describe("ProcessSankey capped scale and hug placement", () => {
  it("caps sparse bands and uses slack to reduce pixel length without changing crossings", () => {
    const stack = computeProcessSankeyLayout(
      processLineageFixture.nodes,
      processLineageFixture.edges,
      { ...baseOptions, maxValueScale: 0.8, lanePlacement: "stack" },
    )
    const hug = computeProcessSankeyLayout(
      processLineageFixture.nodes,
      processLineageFixture.edges,
      { ...baseOptions, maxValueScale: 0.8, lanePlacement: "hug" },
    )
    expect(hug.valueScale).toBe(0.8)
    // Geometry refine (M3) may improve hug order under rendered cost; it must
    // never invent more crossings than the dry stack order.
    expect(hug.layoutQuality.crossings).toBeLessThanOrEqual(stack.layoutQuality.crossings)
    expect(hug.layoutQuality.pixelLength).toBeLessThan(stack.layoutQuality.pixelLength * 0.5)
    expect(hug.layoutQuality.verticalUtilization).toBeLessThan(stack.layoutQuality.verticalUtilization)
  })

  it("geometry-refines order under hug + maxValueScale without raising crossings", () => {
    // M3: dry ordering is scale=1 stack; flagship rivers use hug + cap. The
    // post-scale refine may rearrange lanes under rendered cost but must keep
    // crossings ≤ packing-seed baseline and ≤ dry stack order.
    const stack = computeProcessSankeyLayout(
      processHospitalFixture.nodes,
      processHospitalFixture.edges,
      {
        ...baseOptions,
        packing: "reuse",
        laneOrder: "crossing-min+inside-out",
        lanePlacement: "stack",
      },
    )
    const hug = computeProcessSankeyLayout(
      processHospitalFixture.nodes,
      processHospitalFixture.edges,
      {
        ...baseOptions,
        packing: "reuse",
        laneOrder: "crossing-min+inside-out",
        lanePlacement: "hug",
        maxValueScale: Math.max(0.05, stack.valueScale * 0.55),
      },
    )
    expect(hug.layoutQuality.crossings)
      .toBeLessThanOrEqual(hug.layoutQualityBefore.crossings)
    expect(hug.layoutQuality.crossings)
      .toBeLessThanOrEqual(stack.layoutQuality.crossings)
    expect(hug.layoutQuality.pixelLength)
      .toBeLessThan(stack.layoutQuality.pixelLength)
  })

  it("degenerates exactly to stack when the cap creates no slack", () => {
    const stack = computeProcessSankeyLayout(
      processHospitalFixture.nodes,
      processHospitalFixture.edges,
      { ...baseOptions, maxValueScale: 1_000, lanePlacement: "stack" },
    )
    const hug = computeProcessSankeyLayout(
      processHospitalFixture.nodes,
      processHospitalFixture.edges,
      { ...baseOptions, maxValueScale: 1_000, lanePlacement: "hug" },
    )
    expect(hug.valueScale).toBe(stack.valueScale)
    expect(hug.centerlines).toEqual(stack.centerlines)
    expect(hug.layoutQuality).toEqual(stack.layoutQuality)
  })
})

describe("ProcessSankey ordering hardening", () => {
  it("rejects equal-crossing candidates outside their centering allowance", () => {
    const current = { crossings: 1, cost: 100 }
    expect(acceptsBoundaryHubCandidate({ crossings: 1, cost: 101 }, current)).toBe(false)
    expect(acceptsBoundaryHubCandidate({ crossings: 1, cost: 101 }, current, 1)).toBe(true)
    expect(acceptsBoundaryHubCandidate({ crossings: 0, cost: 10_000 }, current)).toBe(true)
  })

  it("keeps reusable same-target feeders clear of unrelated persistent lanes", () => {
    const fixture = destinationCoherenceFixture()
    const layout = computeProcessSankeyLayout(fixture.nodes, fixture.edges, {
      ...baseOptions,
      plotH: 700,
      packing: "reuse",
      laneOrder: "crossing-min+inside-out",
      lanePlacement: "hug",
    })

    // Terminal exclusive roles may open a few more rows than the pure interval
    // lower bound; the packing contract is destination coherence, not a fixed
    // color count. Exclusive P1/P2→C feeders must not cross unrelated persistent
    // bands T/S on their way to C.
    expect(fixture.nodes).toHaveLength(14)
    expect(fixture.nodes.filter((node) =>
      layout.nodeData[node.id].samples.some((sample) =>
        sample.topMass + sample.botMass > 1e-9,
      ),
    )).toHaveLength(14)
    expect(layout.slots.length).toBeGreaterThanOrEqual(7)
    expect(layout.slots.length).toBeLessThanOrEqual(14)
    expect(layout.layoutQuality.crossings)
      .toBeLessThanOrEqual(layout.layoutQualityBefore.crossings)

    const targetCenter = layout.centerlines.C
    const unrelatedBetweenByFeeder: Record<string, string[]> = {}
    for (const feeder of ["P1", "P2"]) {
      expect(fixture.edges.filter((edge) => edge.target === feeder)).toEqual([])
      expect(fixture.edges.filter((edge) => edge.source === feeder))
        .toMatchObject([{ target: "C" }])
      const feederCenter = layout.centerlines[feeder]
      unrelatedBetweenByFeeder[feeder] = ["T", "S"].filter((persistent) =>
        strictlyBetween(layout.centerlines[persistent], feederCenter, targetCenter),
      )
    }
    expect(unrelatedBetweenByFeeder).toEqual({ P1: [], P2: [] })
  })

  it("keeps destination-coherent large-path refinement deterministic", () => {
    const fixture = destinationCoherenceFixture()
    const options: ProcessSankeyOptions = {
      ...baseOptions,
      plotH: 700,
      packing: "reuse",
      laneOrder: "crossing-min+inside-out",
      lanePlacement: "hug",
    }
    const first = computeProcessSankeyLayout(fixture.nodes, fixture.edges, options)
    const second = computeProcessSankeyLayout(fixture.nodes, fixture.edges, options)

    expect(second).toEqual(first)
    expect(second.slots.length).toBe(first.slots.length)
    expect(second.layoutQuality.crossings)
      .toBeLessThanOrEqual(second.layoutQualityBefore.crossings)
  })

  it("uses bounded exact ordering for dense five-slot graphs", () => {
    const nodes = ["A", "B", "C", "D", "E"].map((id) => ({
      id,
      xExtent: [0, 20] as [number, number],
    }))
    const relationCounts = [
      ["B", "A", 5],
      ["B", "E", 6],
      ["C", "D", 7],
      ["D", "C", 4],
      ["A", "C", 7],
      ["D", "E", 3],
      ["C", "E", 9],
    ] as const
    let edgeIndex = 0
    const edges = relationCounts.flatMap(([source, target, count]) =>
      Array.from({ length: count }, () => ({
        id: `edge-${edgeIndex++}`,
        source,
        target,
        value: 1,
        startTime: 0,
        endTime: 10,
      })),
    )

    expect(edges).toHaveLength(41)
    expect(countCrossings({ D: 0, C: 1, E: 2, A: 3, B: 4 }, edges)).toBe(21)

    const layout = computeProcessSankeyLayout(nodes, edges, {
      ...baseOptions,
      plotH: 500,
      packing: "off",
      domain: [0, 20],
    })

    expect(layout.slots).toHaveLength(5)
    expect(layout.slots.map((slot) => slot.occupants[0].id))
      .toEqual(["D", "C", "E", "A", "B"])
    expect(layout.layoutQuality.crossings).toBe(21)
  })

  it("keeps the 60-node/200-edge ordering path within its runtime budget", () => {
    const fixture = processOrderingStressFixture()
    const started = performance.now()
    const layout = computeProcessSankeyLayout(fixture.nodes, fixture.edges, {
      ...baseOptions,
      plotH: 600,
    })
    const elapsed = performance.now() - started
    // Wall-clock is noisy under shared CI load after a long suite; keep a
    // generous ceiling that still fails on algorithmic blow-ups (minutes).
    // Local hardware typically lands near 0.5s after the density-proxy refine.
    const budgetMs = process.env.CI ? 8_000 : 2_500
    expect(elapsed).toBeLessThan(budgetMs)
    expect(layout.layoutQuality.crossings).toBeLessThan(layout.layoutQualityBefore.crossings)
    expect(layout.layoutQuality.pixelLength).toBeLessThan(layout.layoutQualityBefore.pixelLength)
  })

  it("does not count same-slot fan-outs as crossings", () => {
    const edges = [
      { id: "ac", source: "A", target: "C", value: 1, startTime: 0, endTime: 10 },
      { id: "bd", source: "B", target: "D", value: 1, startTime: 0, endTime: 10 },
    ]
    expect(countCrossings({ A: 0, B: 0, C: 2, D: 3 }, edges)).toBe(0)
  })

  it("rejects duplicate ids that would corrupt attachment maps", () => {
    const issues = validateProcessSankey(
      [{ id: "A" }, { id: "A" }, { id: "B" }],
      [
        { id: "e", source: "A", target: "B", value: 1, startTime: 0, endTime: 1 },
        { id: "e", source: "A", target: "B", value: 1, startTime: 2, endTime: 3 },
      ],
      [0, 3],
    )
    expect(issues.map((issue) => issue.kind)).toEqual(["duplicate-node", "duplicate-edge"])
  })
})
