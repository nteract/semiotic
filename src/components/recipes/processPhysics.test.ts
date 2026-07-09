import { describe, expect, it } from "vitest"
import {
  absorbRegion,
  aggregateRegionCounts,
  bodyGroupSpec,
  capacitatedRegion,
  chargeGateRegion,
  forceFieldRegion,
  groupCompletionRows,
  membraneRegion,
  portalRegion,
  pressureFieldRegion,
  processLaneWalls,
  processStageLayout,
  regionCountsToProjectionRows,
  routeSurfaceRegion,
  stageTargetInVolume,
  type RegionCountMap
} from "./processPhysics"

describe("processStageLayout", () => {
  it("builds equal stage bands for a lane volume", () => {
    const layout = processStageLayout({
      width: 800,
      height: 400,
      shape: "lane",
      stages: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" }
      ],
      idPrefix: "lane"
    })

    expect(layout.stages).toHaveLength(3)
    expect(layout.stages[0].x0).toBe(layout.left)
    expect(layout.stages[2].x1).toBe(layout.right)
    expect(layout.stages[0].width).toBeCloseTo(layout.stages[1].width, 5)
    expect(layout.colliders.map((c) => c.id)).toEqual([
      "lane-top",
      "lane-bottom",
      "lane-left",
      "lane-right"
    ])
    expect(layout.boundaryY(400, "top")).toBe(layout.topY)
    expect(layout.boundaryY(400, "bottom")).toBe(layout.bottomY)
  })

  it("builds bowtie walls and membrane regions", () => {
    const layout = processStageLayout({
      width: 1000,
      height: 430,
      shape: "bowtie",
      padX: 46,
      padY: 72,
      stages: [
        { id: "discovery" },
        { id: "acquisition" },
        { id: "activation" },
        { id: "impact" },
        { id: "habit" },
        { id: "commitment" },
        { id: "leadership" }
      ],
      membranes: [
        { id: "findability", offset: 0.2, cost: 0.24, wobble: -10 },
        { id: "value-fit", offset: 0.36, cost: 0.32, wobble: 9 }
      ],
      idPrefix: "works",
      membraneDampingScale: 0.36
    })

    expect(layout.centerLeft).toBe(layout.stages[3].x0)
    expect(layout.centerRight).toBe(layout.stages[3].x1)
    expect(layout.colliders.some((c) => c.id === "works-left-top")).toBe(true)
    expect(layout.colliders.some((c) => c.id === "works-center-top")).toBe(true)
    expect(layout.membranes).toHaveLength(2)
    expect(layout.regionEffects).toHaveLength(2)
    expect(layout.regionEffects[0]).toMatchObject({
      id: "findability",
      kind: "membrane",
      damping: expect.any(Number)
    })
    expect(layout.regionEffects[0].damping).toBeCloseTo(0.24 * 0.36, 5)

    // Pinch is narrower than the ends.
    const midTop = layout.boundaryY((layout.centerLeft + layout.centerRight) / 2, "top")
    const leftTop = layout.boundaryY(layout.left + 10, "top")
    expect(midTop).toBeGreaterThan(leftTop)
  })

  it("honors relative stage shares", () => {
    const layout = processStageLayout({
      width: 500,
      height: 300,
      stages: [
        { id: "wide", share: 3 },
        { id: "narrow", share: 1 }
      ]
    })
    expect(layout.stages[0].width).toBeCloseTo(layout.stages[1].width * 3, 5)
  })

  it("samples stage targets inside the volume", () => {
    const layout = processStageLayout({
      width: 800,
      height: 400,
      shape: "bowtie",
      stages: [
        { id: "left" },
        { id: "center" },
        { id: "right" }
      ]
    })
    let i = 0
    const random = () => {
      i += 1
      return (i % 10) / 10
    }
    const target = stageTargetInVolume(layout, "center", {
      random,
      along: 0.5,
      jitterX: 0
    })
    expect(target.x).toBeGreaterThanOrEqual(layout.stages[1].x0)
    expect(target.x).toBeLessThanOrEqual(layout.stages[1].x1)
    expect(target.y).toBeGreaterThan(layout.boundaryY(target.x, "top"))
    expect(target.y).toBeLessThan(layout.boundaryY(target.x, "bottom"))
  })
})

describe("process region factories", () => {
  it("stamps primitive metadata on route, pressure, portal, absorb, and capacity regions", () => {
    expect(routeSurfaceRegion({ id: "r", x: 10, y: 20, width: 100, height: 50, force: 14 }).attributes).toMatchObject({
      primitive: "routeSurface"
    })
    expect(
      pressureFieldRegion({
        id: "p",
        x: 10,
        y: 20,
        width: 40,
        height: 80,
        occupancy: 2,
        dampingPerUnit: 0.1
      }).damping
    ).toBeCloseTo(0.08 + 0.2, 5)
    expect(
      capacitatedRegion({
        id: "c",
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        capacity: 4
      }).attributes
    ).toMatchObject({ primitive: "capacitatedSensor", capacity: 4 })
    expect(
      portalRegion({
        id: "portal",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        force: { x: -20, y: 0 },
        targetStage: "revision"
      }).attributes
    ).toMatchObject({ primitive: "portal", targetStage: "revision" })
    expect(
      absorbRegion({ id: "sink", x: 0, y: 0, width: 10, height: 10 }).kind
    ).toBe("sink")
    expect(
      chargeGateRegion({
        id: "impact",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        charge: 2
      }).charge
    ).toBe(2)
    expect(
      forceFieldRegion({
        id: "field",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        force: { x: 5, y: 0 },
        damping: 0.1
      }).damping
    ).toBe(0.1)
    expect(
      membraneRegion({
        id: "m",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        cost: 0.5,
        dampingScale: 0.4
      }).damping
    ).toBeCloseTo(0.2, 5)
  })

  it("builds open lane walls", () => {
    const walls = processLaneWalls({
      left: 0,
      right: 100,
      top: 10,
      bottom: 90,
      openEnds: true
    })
    expect(walls).toHaveLength(2)
  })
})

describe("aggregates and body groups", () => {
  it("counts unique region enters", () => {
    let counts: RegionCountMap = {}
    const region = {
      id: "impact",
      label: "First Impact",
      shape: { type: "aabb" as const, x: 0, y: 0, width: 1, height: 1 }
    }
    counts = aggregateRegionCounts(counts, {
      type: "region-enter",
      bodyId: "a",
      region
    })
    counts = aggregateRegionCounts(counts, {
      type: "region-enter",
      bodyId: "a",
      region
    })
    counts = aggregateRegionCounts(counts, {
      type: "region-enter",
      bodyId: "b",
      region
    })
    counts = aggregateRegionCounts(counts, {
      type: "region-exit",
      bodyId: "c",
      region
    })
    expect(counts.impact.count).toBe(2)
    expect(regionCountsToProjectionRows(counts)).toEqual([
      { label: "First Impact", value: 2 }
    ])
  })

  it("tracks group completion from absorbed members", () => {
    const group = bodyGroupSpec({
      id: "auth",
      label: "Auth",
      bodyIds: ["pr-1", "pr-2", "pr-3"],
      anchor: { x: 100, y: 50 },
      completion: { mode: "allMembersAbsorbed", targetZone: "merged" }
    })
    expect(group.anchor).toEqual({ x: 100, y: 50 })
    const partial = groupCompletionRows([group], ["pr-1", "pr-2"])
    expect(partial[0]).toMatchObject({
      complete: false,
      absorbed: 2,
      total: 3,
      missing: ["pr-3"]
    })
    const done = groupCompletionRows([group], new Set(["pr-1", "pr-2", "pr-3"]))
    expect(done[0].complete).toBe(true)
  })
})
