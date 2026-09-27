import { describe, expect, it } from "vitest"
import { buildBumpRibbonGeometry } from "./bumpRibbonGeometry"

// Independent segment-intersection check, including the closed band outline.
function crossings(points: [number, number][]) {
  const cross = (a: number[], b: number[], c: number[]) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  let count = 0
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 2; j < points.length - 1; j++) {
      const [a, b, c, d] = [points[i], points[i + 1], points[j], points[j + 1]]
      if (cross(a, b, c) * cross(a, b, d) < -1e-8 && cross(c, d, a) * cross(c, d, b) < -1e-8) count++
    }
  }
  return count
}

describe("buildBumpRibbonGeometry", () => {
  it("keeps linear rank reversals free of folded joins", () => {
    const geometry = buildBumpRibbonGeometry([
      { x: 0, y: 0, radius: 18 }, { x: 60, y: 200, radius: 18 }, { x: 120, y: 0, radius: 18 }
    ], { curve: "linear" })
    for (const path of [geometry.topPath, geometry.bottomPath]) {
      expect(crossings(path)).toBe(0)
      for (let i = 1; i < path.length; i++) expect(path[i][0]).toBeGreaterThan(path[i - 1][0])
    }
  })

  it.each([12, 48])("removes steep offset loops while retaining column widths and %i samples per interval", samplesPerSegment => {
    for (const direction of [1, -1]) {
      for (const radii of [[18, 18, 18], [4, 40, 9]]) {
        const geometry = buildBumpRibbonGeometry([
          { x: 0, y: 0, radius: radii[0] },
          { x: 60, y: 200 * direction, radius: radii[1] },
          { x: 120, y: 0, radius: radii[2] }
        ], { samplesPerSegment })
        for (const path of [geometry.topPath, geometry.bottomPath]) {
          expect(crossings(path)).toBe(0)
          for (let i = 1; i < path.length; i++) expect(path[i][0]).toBeGreaterThan(path[i - 1][0])
        }
        const outline = [...geometry.topPath, ...geometry.bottomPath.toReversed(), geometry.topPath[0]]
        expect(crossings(outline)).toBe(0)
        expect(geometry.datumIndices).toHaveLength(samplesPerSegment * 2 + 1)
        for (let i = 0; i < 3; i++) {
          const k = i * samplesPerSegment
          expect(geometry.topPath[k][0]).toBe(i * 60)
          expect(geometry.topPath[k][1] - geometry.bottomPath[k][1]).toBeCloseTo(radii[i] * 2)
          expect(geometry.datumIndices[k]).toBe(i)
        }
      }
    }
  })

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
