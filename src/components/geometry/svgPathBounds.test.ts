import { describe, expect, it } from "vitest"
import { svgPathBounds } from "./svgPathBounds"

describe("SVG path bounds (#1509)", () => {
  it.each([
    ["M0,100 A50,50 0 0 1 100,100", [0, 50, 100, 50]],
    ["M0,100 a50,50 0 01100,0", [0, 50, 100, 50]],
    ["M10 20 H90 V70 H10 Z", [10, 20, 80, 50]],
    ["m10 20 h80 v50 h-80z", [10, 20, 80, 50]],
    ["M1e1,+2e1 90 20 90 70 10 70z", [10, 20, 80, 50]],
    ["M0 0 Q50 100 100 0 T200 0", [0, -50, 200, 100]],
    ["M0 0 C0 100 100 100 100 0 S200 -100 200 0", [0, -75, 200, 150]],
    ["M0 0 q50 100 100 0 t100 0", [0, -50, 200, 100]],
    ["M0 0 c0 100 100 100 100 0 s100 -100 100 0", [0, -75, 200, 150]],
    ["M10 20 h20v10z m50 50h20v10z", [10, 20, 70, 60]],
    ["M0 0 A1 1 0 0 1 100 0", [0, -50, 100, 50]],
    ["M0 0 A0 20 0 0 1 100 0", [0, 0, 100, 0]],
    ["M0 0 L.5-.5 1.5.5", [0, -0.5, 1.5, 1]]
  ] as const)("parses %s", (d, box) => {
    const result = svgPathBounds(d)!
    expect(result).not.toBeNull()
    ;[result.x, result.y, result.w, result.h].forEach((v, i) =>
      expect(v).toBeCloseTo(box[i], 10)
    )
  })

  it("finds rotated elliptical extrema rather than radius or control-point bounds", () => {
    const u = Math.SQRT1_2
    const box = svgPathBounds(
      `M${50 * u} ${50 * u} A50 20 45 1 1 ${-50 * u} ${-50 * u} A50 20 45 1 1 ${50 * u} ${50 * u}`
    )!
    const radius = Math.sqrt(1450)
    expect(box.x).toBeCloseTo(-radius)
    expect(box.y).toBeCloseTo(-radius)
    expect(box.w).toBeCloseTo(2 * radius)
    expect(box.h).toBeCloseTo(2 * radius)
  })

  it.each([
    "",
    "M0 0",
    "M0 0 L1",
    "M0 0 A50 50 0 2 0 100 100",
    "M0 0 R10 20",
    "L0 0",
    "M0 0 L1e999 2",
    "M0 0 Z 10 20"
  ])("rejects empty or malformed geometry: %s", (d) =>
    expect(svgPathBounds(d)).toBeNull()
  )
})
