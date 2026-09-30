import { describe, expect, it } from "vitest"
import {
  normalizeSvgPath,
  polygonPath,
  serializeSvgPath,
  transformSvgPath
} from "./svgPathTransform"

function cubicAt(p0: number[], p: number[], t: number): [number, number] {
  const mt = 1 - t
  const [x1, y1, x2, y2, x3, y3] = p
  return [
    mt ** 3 * p0[0] + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t ** 3 * x3,
    mt ** 3 * p0[1] + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t ** 3 * y3
  ]
}

describe("normalizeSvgPath", () => {
  it("absolutizes relative commands and expands H/V/S/T", () => {
    const segs = normalizeSvgPath("m10 10 h5 v5 l-5 0 z")
    expect(segs.map((s) => s.c).join("")).toBe("MLLLZ")
    expect(segs[1].p).toEqual([15, 10])
    expect(segs[2].p).toEqual([15, 15])
    expect(segs[3].p).toEqual([10, 15])
  })

  it("treats extra moveto pairs as implicit linetos", () => {
    const segs = normalizeSvgPath("M0 0 10 0 10 10")
    expect(segs.map((s) => s.c).join("")).toBe("MLL")
  })

  it("reflects smooth cubic and quadratic control points", () => {
    const s = normalizeSvgPath("M0 0C10 0 20 10 30 10S50 20 60 20")
    expect(s[2].c).toBe("C")
    expect(s[2].p.slice(0, 2)).toEqual([40, 10])
    const t = normalizeSvgPath("M0 0Q10 10 20 0T40 0")
    expect(t[2].c).toBe("Q")
    expect(t[2].p.slice(0, 2)).toEqual([30, -10])
  })

  it("parses compact numbers and exponents", () => {
    const segs = normalizeSvgPath("M.5.5L1e1-2e0")
    expect(segs[0].p).toEqual([0.5, 0.5])
    expect(segs[1].p).toEqual([10, -2])
  })

  it("converts arcs to cubics that stay on the circle", () => {
    // Half circle of radius 10 from (10, 0) to (-10, 0) around the origin.
    const segs = normalizeSvgPath("M10 0A10 10 0 0 1 -10 0")
    const cubics = segs.filter((s) => s.c === "C")
    expect(cubics.length).toBeGreaterThanOrEqual(2)
    let start = [10, 0]
    for (const seg of cubics) {
      for (const t of [0.25, 0.5, 0.75]) {
        const [x, y] = cubicAt(start, seg.p, t)
        expect(Math.abs(Math.hypot(x, y) - 10)).toBeLessThan(0.05)
      }
      start = seg.p.slice(4)
    }
    // Sweep flag 1 in y-down space passes through positive y.
    expect(cubicAt([10, 0], cubics[0].p, 1)[1]).toBeGreaterThan(0)
    expect(start[0]).toBeCloseTo(-10, 6)
  })
})

describe("transformSvgPath", () => {
  it("maps every vertex and control point", () => {
    const out = transformSvgPath("M0 0C1 2 3 4 5 6", (x, y) => [x + 10, y * 2])
    expect(out).toBe("M10 0C11 4 13 8 15 12")
  })

  it("round-trips unchanged geometry through serialize", () => {
    expect(serializeSvgPath(normalizeSvgPath("M1 2L3 4Z"))).toBe("M1 2L3 4Z")
  })

  it("builds closed polygons", () => {
    expect(polygonPath([[0, 0], [1, 0], [1, 1]])).toBe("M0 0L1 0L1 1Z")
  })
})
