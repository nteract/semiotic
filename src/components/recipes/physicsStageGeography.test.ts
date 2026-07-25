/**
 * The stage-geography abstraction has to be *the* shape the existing physics
 * charts already use, not a new one alongside them. These tests prove
 * equivalence against the shipped per-chart helpers without retrofitting them
 * (their SSR baselines depend on the current layouts), so a new chart adopting
 * the shared builder lands in the same visual family.
 */
import { describe, expect, it } from "vitest"
import {
  describePhysicsStageGeography,
  physicsChargePoint,
  physicsDestination,
  physicsStageColliders,
  physicsStageGeography
} from "./physicsStageGeography"
import { physicsChartArea } from "../charts/physics/physicsChartUtils"
import { pileTubeGeometry } from "../charts/physics/physicsPilePhysics"

const SIZE: [number, number] = [700, 420]

describe("physicsStageGeography reproduces the existing lane math", () => {
  // Galton bins and Pile tubes independently wrote the same formula:
  //   centerX(i) = plot.x + (i + 0.5) * plot.width / count
  // The shared builder must produce exactly that.
  it("matches UnitPileChart's tube centers", () => {
    const area = physicsChartArea(SIZE)
    const categories = 5
    const tubes = pileTubeGeometry(area.plot, categories, 8)

    const geography = physicsStageGeography({
      size: SIZE,
      destinations: categories,
      flow: "down",
      padding: {
        top: area.plot.y,
        left: area.plot.x,
        right: SIZE[0] - area.plot.x - area.plot.width,
        bottom: SIZE[1] - area.plot.y - area.plot.height
      }
    })

    expect(geography.destinations).toHaveLength(categories)
    for (let index = 0; index < categories; index += 1) {
      expect(geography.destinations[index].centerX).toBeCloseTo(tubes.centerX(index), 6)
    }
  })

  it("matches the Galton bin-lane centers the projection overlay draws", () => {
    const area = physicsChartArea(SIZE)
    const bins = 21
    const laneWidth = area.plot.width / bins
    // This is the literal expression in galtonBoardOverlay.
    const overlayCenter = (index: number) => area.plot.x + (index + 0.5) * laneWidth

    const geography = physicsStageGeography({
      size: SIZE,
      destinations: bins,
      flow: "down",
      padding: {
        top: area.plot.y,
        left: area.plot.x,
        right: SIZE[0] - area.plot.x - area.plot.width,
        bottom: SIZE[1] - area.plot.y - area.plot.height
      }
    })

    for (let index = 0; index < bins; index += 1) {
      expect(geography.destinations[index].centerX).toBeCloseTo(overlayCenter(index), 6)
    }
  })
})

describe("physicsStageGeography zones", () => {
  it("splits the flow axis into charge → apparatus → destinations without gaps", () => {
    const geography = physicsStageGeography({
      size: SIZE,
      destinations: 6,
      padding: 0,
      chargeExtent: 0.1,
      destinationExtent: 0.5,
      projectionExtent: 0.1
    })

    const { charge, apparatus, destinations, projection } = geography
    // Contiguous: each zone starts where the previous ends.
    expect(apparatus.y).toBeCloseTo(charge.y + charge.height, 6)
    expect(destinations[0].y).toBeCloseTo(apparatus.y + apparatus.height, 6)
    expect(projection.y).toBeCloseTo(destinations[0].y + destinations[0].height, 6)
    // And they exactly fill the box.
    expect(projection.y + projection.height).toBeCloseTo(SIZE[1], 6)
  })

  it("supports a horizontal process flow", () => {
    const geography = physicsStageGeography({
      size: SIZE,
      destinations: [{ id: "shipped", label: "Shipped" }, { id: "dropped", label: "Dropped" }],
      flow: "right",
      padding: 0
    })

    expect(geography.flow).toBe("right")
    expect(geography.apparatus.x).toBeCloseTo(
      geography.charge.x + geography.charge.width,
      6
    )
    // Lanes stack on the cross axis when flow is horizontal.
    expect(geography.destinations[0].centerY).toBeLessThan(
      geography.destinations[1].centerY
    )
  })

  it("leaves gutters between channels when channelRatio < 1 (tubes, not bins)", () => {
    const bins = physicsStageGeography({ size: SIZE, destinations: 4, padding: 0, channelRatio: 1 })
    const tubes = physicsStageGeography({ size: SIZE, destinations: 4, padding: 0, channelRatio: 0.7 })

    // Bins touch; tubes do not. Centers are unchanged either way.
    expect(bins.destinations[0].width).toBeCloseTo(SIZE[0] / 4, 6)
    expect(tubes.destinations[0].width).toBeCloseTo((SIZE[0] / 4) * 0.7, 6)
    expect(tubes.destinations[2].centerX).toBeCloseTo(bins.destinations[2].centerX, 6)
  })

  it("looks destinations up by id and names them", () => {
    const geography = physicsStageGeography({
      size: SIZE,
      destinations: [{ id: "on-time", label: "On time" }, { id: "late", label: "Late" }]
    })
    expect(physicsDestination(geography, "late")?.label).toBe("Late")
    expect(physicsDestination(geography, "nope")).toBeUndefined()
  })

  it("degrades safely on empty or negative input", () => {
    const empty = physicsStageGeography({ size: SIZE, destinations: [] })
    expect(empty.destinations).toHaveLength(1)
    const zero = physicsStageGeography({ size: SIZE, destinations: 0 })
    expect(zero.destinations).toHaveLength(1)
  })
})

describe("physicsChargePoint", () => {
  it("spreads a burst across the charge zone instead of co-locating it", () => {
    const geography = physicsStageGeography({ size: SIZE, destinations: 5, padding: 0 })
    const points = Array.from({ length: 4 }, (_, index) =>
      physicsChargePoint(geography, index, 4)
    )
    const xs = points.map((point) => point.x)
    expect(new Set(xs).size).toBe(4)
    // All inside the charge zone.
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(geography.charge.x)
      expect(point.x).toBeLessThanOrEqual(geography.charge.x + geography.charge.width)
      expect(point.y).toBeGreaterThanOrEqual(geography.charge.y)
      expect(point.y).toBeLessThanOrEqual(geography.charge.y + geography.charge.height)
    }
  })

  it("wraps rather than escaping the zone when index exceeds count", () => {
    const geography = physicsStageGeography({ size: SIZE, destinations: 3, padding: 0 })
    const wrapped = physicsChargePoint(geography, 7, 3)
    expect(wrapped.x).toBeGreaterThanOrEqual(geography.charge.x)
    expect(wrapped.x).toBeLessThanOrEqual(geography.charge.x + geography.charge.width)
  })
})

describe("physicsStageColliders", () => {
  it("emits a floor plus one divider per interior boundary", () => {
    const geography = physicsStageGeography({ size: SIZE, destinations: 5, padding: 0 })
    const colliders = physicsStageColliders(geography, { walls: false })

    expect(colliders.filter((c) => c.id.endsWith("-floor"))).toHaveLength(1)
    // n destinations need n-1 dividers, not n or n+1.
    expect(colliders.filter((c) => c.id.includes("-divider-"))).toHaveLength(4)
  })

  it("places dividers between adjacent destination centers", () => {
    const geography = physicsStageGeography({ size: SIZE, destinations: 4, padding: 0 })
    const dividers = physicsStageColliders(geography, { walls: false }).filter((c) =>
      c.id.includes("-divider-")
    )

    for (let index = 0; index < dividers.length; index += 1) {
      const shape = dividers[index].shape as { x1: number }
      const left = geography.destinations[index].centerX
      const right = geography.destinations[index + 1].centerX
      expect(shape.x1).toBeGreaterThan(left)
      expect(shape.x1).toBeLessThan(right)
    }
  })

  it("adds outer walls by default and omits them on request", () => {
    const geography = physicsStageGeography({ size: SIZE, destinations: 2, padding: 0 })
    expect(
      physicsStageColliders(geography).some((c) => c.id.endsWith("-wall-left"))
    ).toBe(true)
    expect(
      physicsStageColliders(geography, { walls: false }).some((c) =>
        c.id.includes("-wall-")
      )
    ).toBe(false)
  })

  it("emits horizontal-flow dividers on the cross axis", () => {
    const geography = physicsStageGeography({
      size: SIZE,
      destinations: 3,
      flow: "right",
      padding: 0
    })
    const dividers = physicsStageColliders(geography, { walls: false }).filter((c) =>
      c.id.includes("-divider-")
    )
    expect(dividers).toHaveLength(2)
    for (const divider of dividers) {
      const shape = divider.shape as { y1: number; y2: number }
      expect(shape.y1).toBeCloseTo(shape.y2, 6)
    }
  })
})

describe("describePhysicsStageGeography", () => {
  it("states the reading protocol in one sentence", () => {
    const geography = physicsStageGeography({
      size: SIZE,
      destinations: [{ id: "on-time", label: "On time" }, { id: "late", label: "Late" }]
    })
    const sentence = describePhysicsStageGeography(geography, {
      charge: "Events",
      apparatus: "a watermark barrier",
      destination: "windows"
    })
    expect(sentence).toContain("Events enter at the top")
    expect(sentence).toContain("a watermark barrier")
    expect(sentence).toContain("2 windows")
    expect(sentence).toContain("On time, Late")
  })

  it("has usable defaults", () => {
    const geography = physicsStageGeography({ size: SIZE, destinations: 3 })
    expect(describePhysicsStageGeography(geography)).toContain("bodies enter")
  })
})
