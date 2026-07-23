import { describe, expect, it } from "vitest"
import { buildBumpRibbonGeometry } from "./bumpRibbonGeometry"

describe("buildBumpRibbonGeometry", () => {
  it("keeps thickness perpendicular to a steep rank change", () => {
    const points = [
      { x: 0, y: 0, radius: 10 },
      { x: 100, y: 100, radius: 10 },
    ]
    const geometry = buildBumpRibbonGeometry(points, {
      curve: "linear",
      samplesPerSegment: 2,
    })

    const top = geometry.topPath[1]
    const bottom = geometry.bottomPath[1]
    expect(Math.hypot(top[0] - bottom[0], top[1] - bottom[1])).toBeCloseTo(20)
    // A vertical-only area offset would leave both x coordinates at 50.
    expect(top[0]).not.toBeCloseTo(bottom[0])
  })

  it("preserves the requested radius at smooth ranking columns", () => {
    const geometry = buildBumpRibbonGeometry([
      { x: 0, y: 80, radius: 4 },
      { x: 100, y: 10, radius: 12 },
      { x: 200, y: 50, radius: 7 },
    ], { curve: "smooth", samplesPerSegment: 4 })

    expect(geometry.topPath[0]).toEqual([0, 84])
    expect(geometry.bottomPath[0]).toEqual([0, 76])
    expect(geometry.topPath[4]).toEqual([100, 22])
    expect(geometry.bottomPath[4]).toEqual([100, -2])
  })

  it("emits a stable sample count and aligned datum indices", () => {
    const geometry = buildBumpRibbonGeometry([
      { x: 0, y: 10, radius: 2 },
      { x: 100, y: 20, radius: 3 },
      { x: 200, y: 30, radius: 4 },
    ], { samplesPerSegment: 6 })

    expect(geometry.topPath).toHaveLength(13)
    expect(geometry.bottomPath).toHaveLength(13)
    expect(geometry.datumIndices).toHaveLength(13)
    expect(geometry.datumIndices[0]).toBe(0)
    expect(geometry.datumIndices.at(-1)).toBe(2)
  })
})
