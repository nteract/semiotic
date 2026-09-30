import { describe, expect, it } from "vitest"
import { extrudeOutline, samplePolygon } from "./networkPerspectiveSolid"
import { normalizeSvgPath } from "./svgPathTransform"

describe("samplePolygon", () => {
  it("flattens curves and drops a duplicated closing point", () => {
    const pts = samplePolygon(normalizeSvgPath("M0 0L10 0Q10 10 0 10L0 0Z"), 4)
    expect(pts[0]).toEqual([0, 0])
    expect(pts[1]).toEqual([10, 0])
    // Four samples along the quadratic, ending at its end point.
    expect(pts[5]).toEqual([0, 10])
    expect(pts).toHaveLength(6)
  })
})

describe("extrudeOutline", () => {
  const diamond: Array<[number, number]> = [[50, 0], [100, 30], [50, 60], [0, 30]]

  it("walls the two front edges of an iso diamond, lighter on the left", () => {
    const all = extrudeOutline(diamond, 10)
    // First a backing strip under both walls, in the darker shade, so the
    // seam between the walls never shows the background.
    expect(all).toHaveLength(3)
    expect(all[0].shade).toBeCloseTo(-0.36, 6)
    expect(all[0].pathD).toContain("0 30")
    expect(all[0].pathD).toContain("100 30")
    const faces = all.slice(1)
    const left = faces.find((f) => /(^|[ML])0 30/.test(f.pathD))!
    const right = faces.find((f) => f !== left)!
    expect(left.shade).toBeCloseTo(-0.16, 6)
    expect(right.shade).toBeCloseTo(-0.36, 6)
    // A wall spans the edge and the same edge `drop` px lower.
    expect(left.pathD).toMatch(/^M.*Z$/)
    expect(left.pathD).toContain("50 60")
    expect(left.pathD).toContain("50 70")
  })

  it("is winding-independent and empty without thickness", () => {
    const reversed = extrudeOutline([...diamond].reverse(), 10)
    expect(reversed.map((f) => f.shade).sort()).toEqual(extrudeOutline(diamond, 10).map((f) => f.shade).sort())
    expect(extrudeOutline(diamond, 0)).toEqual([])
    expect(extrudeOutline([[0, 0], [1, 1]], 10)).toEqual([])
  })

  it("merges a curved rim into a few lit bands", () => {
    const ellipse = Array.from({ length: 48 }, (_, i): [number, number] => {
      const t = (i / 48) * Math.PI * 2
      return [Math.cos(t) * 20, Math.sin(t) * 10]
    })
    const faces = extrudeOutline(ellipse, 4)
    expect(faces.length).toBeGreaterThan(2)
    expect(faces.length).toBeLessThan(16)
  })
})
