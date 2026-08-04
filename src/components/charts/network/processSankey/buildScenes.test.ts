import { describe, expect, it } from "vitest"
import { buildProcessSankeyScenes } from "./buildScenes"
import { resolveProcessSankeyMarginDefaults } from "./frameMargins"

function verticalPathEnd(pathD: string): number {
  const pairs = [...pathD.matchAll(
    /(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?),(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/gi,
  )]
  if (pairs.length === 0) throw new Error(`Expected path coordinates in: ${pathD}`)
  return Math.max(...pairs.map((pair) => Number(pair[2])))
}

describe("buildProcessSankeyScenes validation policy", () => {
  it("allows zero-duration edges and only fatals block layout", () => {
    const ok = buildProcessSankeyScenes({
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [{
        id: "instant",
        source: "A",
        target: "B",
        value: 1,
        startTime: 50,
        endTime: 50,
      }],
      domain: [0, 100],
      plotW: 400,
      plotH: 300,
      ribbonLane: "both",
      edgeOpacity: 0.4,
      colorOf: () => "#111",
      layoutOpts: { packing: "off", laneOrder: "insertion" },
    })
    expect(ok.issues).toEqual([])
    expect(ok.layout).not.toBeNull()
    expect(ok.layoutConfig.bands.length).toBeGreaterThan(0)

    const bad = buildProcessSankeyScenes({
      nodes: [{ id: "A" }],
      edges: [{
        id: "orphan",
        source: "A",
        target: "Missing",
        value: 1,
        startTime: 10,
        endTime: 20,
      }],
      domain: [0, 100],
      plotW: 400,
      plotH: 300,
      ribbonLane: "both",
      edgeOpacity: 0.4,
      colorOf: () => "#111",
      layoutOpts: {},
    })
    expect(bad.layout).toBeNull()
    expect(bad.issues.some((i) => i.kind === "missing-node")).toBe(true)
  })

  it("resolves and bounds confidence-aware ribbon opacity per raw edge", () => {
    const scene = buildProcessSankeyScenes({
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [
        { id: "high", source: "A", target: "B", value: 1, startTime: 10, endTime: 20, confidence: "high" },
        { id: "low", source: "A", target: "C", value: 1, startTime: 10, endTime: 20, confidence: "low" },
      ],
      domain: [0, 30],
      plotW: 400,
      plotH: 300,
      ribbonLane: "both",
      edgeOpacity: (edge) => edge.confidence === "high" ? 0.8 : 1.4,
      colorOf: () => "#111",
      layoutOpts: { packing: "off", laneOrder: "insertion" },
    })

    expect(scene.layoutConfig.ribbons.map((ribbon) => ribbon.opacity)).toEqual([0.8, 1])
  })

  it("CSR/SSR margin defaults stay aligned on horizontal gutters", () => {
    const margin = resolveProcessSankeyMarginDefaults(true, true, true, "horizontal")
    expect(margin.left).toBe(80)
    expect(margin.right).toBe(80)
    expect(margin.top).toBe(30)
    expect(margin.bottom).toBe(28)
  })
})

describe("buildProcessSankeyScenes feeder runway", () => {
  it("keeps the pure SSR scene on the same adaptive vertical geometry", () => {
    const common = {
      nodes: [
        { id: "Feeder", xExtent: [0, 100] as [number, number] },
        { id: "Main", xExtent: [0, 100] as [number, number] },
      ],
      edges: [{
        id: "feeder-main",
        source: "Feeder",
        target: "Main",
        value: 1,
        startTime: 96,
        endTime: 100,
      }],
      domain: [0, 100] as [number, number],
      plotW: 600,
      plotH: 600,
      orientation: "vertical" as const,
      ribbonLane: "both" as const,
      edgeOpacity: 0.5,
      colorOf: () => "#123456",
      layoutOpts: {
        pairing: "temporal" as const,
        packing: "off" as const,
        laneOrder: "insertion" as const,
        lifetimeMode: "full" as const,
      },
    }

    const exact = buildProcessSankeyScenes(common)
    const smoothed = buildProcessSankeyScenes({ ...common, ribbonMinRun: "auto" })
    const exactPoints = exact.layoutConfig.ribbons[0].bezier?.points
    const smoothedPoints = smoothed.layoutConfig.ribbons[0].bezier?.points

    expect(smoothedPoints?.[0].y).toBeLessThan(exactPoints?.[0].y ?? 0)
    expect(smoothedPoints?.[3].y).toBe(exactPoints?.[3].y)
    expect(smoothed.layoutConfig.ribbons[0].rawDatum).toMatchObject({
      startTime: 96,
      endTime: 100,
    })
  })

  it("hands a pulled feeder slice from its node band to the ribbon at one shared visual time", () => {
    const edge = {
      id: "feeder-main",
      source: "Feeder",
      target: "Main",
      value: 1,
      startTime: 96,
      endTime: 100,
    }
    const input = {
      nodes: [
        { id: "Feeder", xExtent: [0, 96] as [number, number] },
        { id: "Main", xExtent: [0, 100] as [number, number] },
      ],
      edges: [edge],
      domain: [0, 100] as [number, number],
      plotW: 600,
      plotH: 600,
      orientation: "vertical" as const,
      ribbonLane: "both" as const,
      ribbonMinRun: 80,
      edgeOpacity: 0.5,
      colorOf: () => "#123456",
      layoutOpts: {
        pairing: "temporal" as const,
        packing: "off" as const,
        laneOrder: "insertion" as const,
        lifetimeMode: "full" as const,
      },
    }

    const scene = buildProcessSankeyScenes(input)
    const feederBand = scene.layoutConfig.bands.find((band) => band.id === "Feeder")
    const ribbon = scene.layoutConfig.ribbons.find((candidate) => candidate.id === edge.id)
    const visualRibbonStart = ribbon?.bezier?.points?.[0].y

    expect(visualRibbonStart).toBe(520)
    // This one-unit, one-edge feeder has exactly one rendered stock slice.
    // Once its ribbon begins curving, that slice must no longer paint beneath it.
    expect(verticalPathEnd(feederBand?.pathD ?? "")).toBe(visualRibbonStart)
    expect(ribbon?.rawDatum).toMatchObject({ startTime: 96, endTime: 100 })
    expect(edge.startTime).toBe(96)
  })

  it("moves a same-time feeder batch as one contiguous rendered event", () => {
    const edges = [
      { id: "feeder-near", source: "Feeder", target: "Near", value: 1, startTime: 96, endTime: 100 },
      { id: "feeder-far", source: "Feeder", target: "Far", value: 1, startTime: 96, endTime: 100 },
    ]
    const scene = buildProcessSankeyScenes({
      nodes: [
        { id: "Feeder", xExtent: [0, 96] },
        { id: "Near", xExtent: [0, 100] },
        { id: "Far", xExtent: [0, 100] },
      ],
      edges,
      domain: [0, 100],
      plotW: 600,
      plotH: 600,
      orientation: "vertical",
      ribbonLane: "both",
      ribbonMinRun: "auto",
      edgeOpacity: 0.5,
      colorOf: () => "#123456",
      layoutOpts: {
        pairing: "temporal",
        packing: "off",
        laneOrder: "insertion",
        lifetimeMode: "full",
      },
    })
    const starts = scene.layoutConfig.ribbons.map((ribbon) => ribbon.bezier?.points?.[0].y)
    const feederBand = scene.layoutConfig.bands.find((band) => band.id === "Feeder")

    expect(new Set(starts).size).toBe(1)
    expect(starts[0]).toBeLessThan(576)
    expect(verticalPathEnd(feederBand?.pathD ?? "")).toBe(starts[0])
    expect(scene.layout?.nodeData.Feeder.samples.some((sample) => sample.t === 96)).toBe(true)
    expect(edges.every((edge) => edge.startTime === 96)).toBe(true)
  })

  it("keeps a lockstep bonded feeder group contiguous through its visual handoff", () => {
    const scene = buildProcessSankeyScenes({
      nodes: [
        { id: "Red", group: "founding", xExtent: [0, 96] },
        { id: "White", group: "founding", xExtent: [0, 96] },
        { id: "Blue", group: "founding", xExtent: [0, 96] },
        { id: "Main", xExtent: [0, 100] },
      ],
      edges: [
        { id: "red-main", source: "Red", target: "Main", value: 1, startTime: 96, endTime: 100 },
        { id: "white-main", source: "White", target: "Main", value: 1, startTime: 96, endTime: 100 },
        { id: "blue-main", source: "Blue", target: "Main", value: 1, startTime: 96, endTime: 100 },
      ],
      domain: [0, 100],
      plotW: 600,
      plotH: 600,
      orientation: "vertical",
      ribbonLane: "both",
      ribbonMinRun: "auto",
      edgeOpacity: 0.5,
      colorOf: () => "#123456",
      layoutOpts: {
        pairing: "temporal",
        packing: "reuse",
        laneOrder: "crossing-min",
        lifetimeMode: "full",
        groupPadding: 0,
      },
    })
    const starts = scene.layoutConfig.ribbons.map((ribbon) => ribbon.bezier?.points?.[0].y)
    const feederBands = scene.layoutConfig.bands.filter((band) => band.id !== "Main")

    expect(new Set(starts).size).toBe(1)
    expect(feederBands.map((band) => verticalPathEnd(band.pathD)))
      .toEqual([starts[0], starts[0], starts[0]])
    const orderedBands = feederBands
      .map((band) => band.pathD.match(/^M([^,]+)/)?.[1])
      .map(Number)
      .sort((a, b) => a - b)
    expect(orderedBands).toHaveLength(3)
  })
})
