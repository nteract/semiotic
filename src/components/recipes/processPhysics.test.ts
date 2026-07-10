import { describe, expect, it } from "vitest"
import {
  absorbRegion,
  capacitatedRegion,
  chargeGateRegion,
  forceFieldRegion,
  membraneRegion,
  portalRegion,
  pressureFieldRegion,
  processLaneWalls,
  processStageLayout,
  processStageRegions,
  routeSurfaceRegion,
  stageTargetInVolume
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

  it("expands bowtie barriers and stage sensors from one pixel offset", () => {
    const options = {
      width: 720,
      height: 320,
      shape: "bowtie" as const,
      padY: 48,
      stages: [{ id: "incoming" }, { id: "impact" }, { id: "outgoing" }],
      centerStageIndex: 1,
      idPrefix: "adaptive"
    }
    const base = processStageLayout(options)
    const expanded = processStageLayout({
      ...options,
      pinchHeightOffset: 20
    })

    expect(expanded.pinchHeight - base.pinchHeight).toBeCloseTo(20, 8)
    expect(expanded.pinchTop - base.pinchTop).toBeCloseTo(-10, 8)
    expect(expanded.pinchBottom - base.pinchBottom).toBeCloseTo(10, 8)
    expect(expanded.colliders.map((collider) => collider.id)).toEqual(
      base.colliders.map((collider) => collider.id)
    )

    const collider = (id: string) =>
      expanded.colliders.find((candidate) => candidate.id === id)?.shape
    expect(collider("adaptive-left-top")).toMatchObject({
      type: "segment",
      y2: expanded.pinchTop
    })
    expect(collider("adaptive-center-top")).toMatchObject({
      type: "segment",
      y1: expanded.pinchTop,
      y2: expanded.pinchTop
    })
    expect(collider("adaptive-right-top")).toMatchObject({
      type: "segment",
      y1: expanded.pinchTop
    })
    expect(collider("adaptive-left-bottom")).toMatchObject({
      type: "segment",
      y2: expanded.pinchBottom
    })
    expect(collider("adaptive-center-bottom")).toMatchObject({
      type: "segment",
      y1: expanded.pinchBottom,
      y2: expanded.pinchBottom
    })
    expect(collider("adaptive-right-bottom")).toMatchObject({
      type: "segment",
      y1: expanded.pinchBottom
    })

    const baseRegions = processStageRegions(base)
    const expandedRegions = processStageRegions(expanded)
    expect(
      expandedRegions[1].shape.type === "aabb" &&
        baseRegions[1].shape.type === "aabb"
        ? expandedRegions[1].shape.height - baseRegions[1].shape.height
        : NaN
    ).toBeCloseTo(20, 8)
  })

  it("clamps non-finite and extreme pinch offsets deterministically", () => {
    const options = {
      width: 500,
      height: 300,
      shape: "bowtie" as const,
      stages: [{ id: "left" }, { id: "center" }, { id: "right" }]
    }
    const base = processStageLayout(options)
    const invalid = processStageLayout({ ...options, pinchHeightOffset: NaN })
    const minimum = processStageLayout({
      ...options,
      pinchHeightOffset: -10000
    })
    const maximum = processStageLayout({
      ...options,
      pinchHeightOffset: 10000
    })
    const usableHeight = base.bottomY - base.topY

    expect(invalid.pinchHeight).toBe(base.pinchHeight)
    expect(minimum.pinchHeight).toBeCloseTo(usableHeight * 0.06, 8)
    expect(maximum.pinchHeight).toBeCloseTo(usableHeight * 0.5, 8)
  })

  it("leaves lane barriers unchanged when a pinch offset is supplied", () => {
    const options = {
      width: 500,
      height: 260,
      shape: "lane" as const,
      stages: [{ id: "one" }, { id: "two" }]
    }
    const base = processStageLayout(options)
    const offset = processStageLayout({ ...options, pinchHeightOffset: 40 })

    expect(offset.colliders).toEqual(base.colliders)
    expect(offset.stages).toEqual(base.stages)
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

  it("clamps horizontal target jitter inside the requested stage", () => {
    const layout = processStageLayout({
      width: 300,
      height: 180,
      stages: [{ id: "first" }, { id: "second" }]
    })
    const target = stageTargetInVolume(layout, "first", {
      along: 0.95,
      jitterX: 1000,
      random: () => 1
    })

    expect(target.x).toBeGreaterThan(layout.stages[0].x0)
    expect(target.x).toBeLessThan(layout.stages[0].x1)
  })

  it("builds observable regions for every process stage", () => {
    const layout = processStageLayout({
      width: 500,
      height: 240,
      stages: [{ id: "discover", label: "Discover" }, { id: "impact" }]
    })
    const regions = processStageRegions(layout, {
      idPrefix: "journey",
      metadata: { systemId: "relay" }
    })

    expect(regions.map((region) => region.id)).toEqual([
      "journey:discover",
      "journey:impact"
    ])
    expect(regions[1]).toMatchObject({
      label: "impact",
      metadata: {
        primitive: "processStage",
        stageId: "impact",
        stageIndex: 1,
        systemId: "relay"
      },
      attributes: {
        primitive: "processStage",
        stageId: "impact",
        stageIndex: 1
      }
    })
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
