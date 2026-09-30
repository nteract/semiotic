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

  it("rounds isometric shade ties consistently despite coordinate roundoff", () => {
    for (const drift of [-1e-12, 0, 1e-12]) {
      for (const scale of [0.1, 1, 10]) {
        const x = Math.sqrt(3) * 20 * (1 + drift)
        const outline: Array<[number, number]> = [[0, 0], [x, 20], [0, 40], [-x, 20]]
        const top = outline.map(([px, py]): [number, number] => [100 + px * scale, 100 + py * scale])
        for (const points of [top, [...top].reverse()]) {
          expect(extrudeOutline(points, 10).map((face) => face.shade).sort((a, b) => a - b))
            .toEqual([-0.32, -0.32, -0.16])
        }
      }
    }
  })

  it("retains distinct shade bands outside the roundoff tolerance", () => {
    for (const [drift, expected] of [
      [-1e-6, [-0.36, -0.36, -0.16]],
      [1e-6, [-0.32, -0.32, -0.2]]
    ] as const) {
      const x = Math.sqrt(3) * 20 * (1 + drift)
      expect(extrudeOutline([[0, 0], [x, 20], [0, 40], [-x, 20]], 10)
        .map((face) => face.shade).sort((a, b) => a - b)).toEqual(expected)
    }
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
