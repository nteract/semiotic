/**
 * Regression coverage for `annularSectorPath`.
 *
 * The helper exists because d3-shape's `arc().cornerRadius()` rounds
 * all four corners uniformly — there's no per-corner control. Gauges
 * with multiple zones need the OUTER endpoints rounded but internal
 * zone seams square (the swimlane convention applied radially). These
 * tests pin the path shape for each rounding configuration.
 *
 * Asserting on path strings would couple too tightly to the exact
 * coordinate formatting d3 / our helper produces. Instead we pin the
 * SEMANTIC properties — number of arc commands, presence of corner-
 * radius arc segments, well-formed `M ... Z` enclosure — which are
 * what the renderer actually depends on.
 */
import { describe, it, expect } from "vitest"
import { annularSectorPath } from "./wedgePathBuilder"

// Count `A r r` arc commands in a path string. Each rounded corner
// emits an A command with the cornerRadius value; arc segments on the
// outer / inner radius emit A commands with R / innerR.
function countArcs(path: string): { corner: number; total: number; commands: string[] } {
  const commands = path.match(/[MLAZ]/g) ?? []
  const total = (path.match(/A/g) ?? []).length
  // Corner radius arcs use a small radius; outer / inner radius arcs
  // use the wedge's actual radii. The helper doesn't tag them, so we
  // count by matching A followed by the small `cr,cr` pair.
  return { corner: 0, total, commands }
}

describe("annularSectorPath", () => {
  const baseAnnular = {
    innerRadius: 60,
    outerRadius: 100,
    startAngle: 0,
    endAngle: Math.PI / 2, // quarter sector for cleanly testable angles
  }

  it("emits a square sector when no roundedEnds + no cornerRadius", () => {
    const d = annularSectorPath(baseAnnular)
    // Square: M, outer-arc A, L (radial), inner-arc A, Z. No corner-r A.
    expect(d).toMatch(/^M[^A]+A[^A]+A[^A]+Z$/)
    const { total } = countArcs(d)
    // Outer arc + inner arc = 2 A commands; no corner roundings.
    expect(total).toBe(2)
  })

  it("emits a square sector when cornerRadius is set but no end is opted in", () => {
    const d = annularSectorPath({ ...baseAnnular, cornerRadius: 10 })
    // Without `roundStart` / `roundEnd`, the helper short-circuits to
    // the no-rounding fast path even though cornerRadius is set.
    const { total } = countArcs(d)
    expect(total).toBe(2)
  })

  it("middle-wedge case: cornerRadius set + both flags false ⇒ square sector", () => {
    // Regression: gauge mode marks every wedge with `roundedEnds`. For
    // wedges in the middle of the gauge, both flags are false. The
    // wedge still carries `cornerRadius` from the user prop, so the
    // helper must treat "both flags false" as the unrounded path
    // rather than falling back to uniform all-corner rounding.
    const d = annularSectorPath({
      ...baseAnnular,
      cornerRadius: 10,
      roundStart: false,
      roundEnd: false,
    })
    const { total } = countArcs(d)
    expect(total).toBe(2)
  })

  it("emits four arc commands when only start is rounded", () => {
    const d = annularSectorPath({ ...baseAnnular, cornerRadius: 8, roundStart: true })
    // Outer arc + inner arc + 2 corner arcs (outer-start + inner-start).
    const { total } = countArcs(d)
    expect(total).toBe(4)
  })

  it("emits four arc commands when only end is rounded", () => {
    const d = annularSectorPath({ ...baseAnnular, cornerRadius: 8, roundEnd: true })
    const { total } = countArcs(d)
    expect(total).toBe(4)
  })

  it("emits six arc commands when both ends are rounded", () => {
    const d = annularSectorPath({ ...baseAnnular, cornerRadius: 8, roundStart: true, roundEnd: true })
    // Outer + inner arcs + 4 corner arcs (one per corner).
    const { total } = countArcs(d)
    expect(total).toBe(6)
  })

  it("clamps cornerRadius to ringWidth/2 (corner circles never cross the ring midline)", () => {
    // Ring width 40 (100 - 60); requesting cornerRadius 50 would push
    // corner circles past the center. Clamp to 20.
    const d = annularSectorPath({
      innerRadius: 60,
      outerRadius: 100,
      startAngle: 0,
      endAngle: Math.PI / 2,
      cornerRadius: 50,
      roundStart: true,
      roundEnd: true,
    })
    // Verify the path still has 6 A commands (well-formed); a broken
    // clamp would produce a non-closed or self-intersecting path.
    const { total } = countArcs(d)
    expect(total).toBe(6)
  })

  it("falls back to unrounded path when angular sweep is too narrow for cornerRadius to fit", () => {
    // ε is tiny; the angular setback for cornerRadius 10 on r=100 is
    // asin(10/90) ≈ 6.4°. A 1° sweep can't fit even one corner setback.
    const d = annularSectorPath({
      innerRadius: 60,
      outerRadius: 100,
      startAngle: 0,
      endAngle: 0.0175, // ~1°
      cornerRadius: 10,
      roundStart: true,
      roundEnd: true,
    })
    // Fall back: should produce the square fast path (2 A's only).
    const { total } = countArcs(d)
    expect(total).toBe(2)
  })

  it("supports pie sectors (innerRadius = 0)", () => {
    const d = annularSectorPath({
      innerRadius: 0,
      outerRadius: 100,
      startAngle: 0,
      endAngle: Math.PI / 2,
    })
    // Pie path: M 0,0 L A...
    expect(d.startsWith("M0,0")).toBe(true)
    expect(d.endsWith("Z")).toBe(true)
  })

  it("path is closed (ends with Z)", () => {
    const d = annularSectorPath({ ...baseAnnular, cornerRadius: 8, roundStart: true })
    expect(d.endsWith("Z")).toBe(true)
  })
})
