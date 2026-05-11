import { describe, it, expect } from "vitest"
import { buildRibbonGeometry } from "./ribbonGeometry"

describe("buildRibbonGeometry", () => {
  // ── pathD ──────────────────────────────────────────────────────────────

  it("emits a closed M-C-L-C-Z path", () => {
    const { pathD } = buildRibbonGeometry({
      sx: 0, sTop: 0, sBot: 10,
      tx: 100, tTop: 20, tBot: 30,
      cp1X: 25, cp2X: 75,
    })
    // Sanity-check the structural shape: M, C, L, C, Z each present once.
    expect(pathD).toMatch(/^M/)
    expect(pathD).toContain("C")
    expect(pathD).toContain("L")
    expect(pathD.trim().endsWith("Z")).toBe(true)
    expect((pathD.match(/C/g) || []).length).toBe(2)
  })

  it("first C control points use cp1X/cp2X at sTop/tTop", () => {
    const { pathD } = buildRibbonGeometry({
      sx: 0, sTop: 0, sBot: 10,
      tx: 100, tTop: 20, tBot: 30,
      cp1X: 25, cp2X: 75,
    })
    // Top edge: C cp1X,sTop  cp2X,tTop  tx,tTop
    expect(pathD).toContain("C25,0 75,20 100,20")
  })

  it("second C control points mirror — cp2X at tBot, cp1X at sBot", () => {
    const { pathD } = buildRibbonGeometry({
      sx: 0, sTop: 0, sBot: 10,
      tx: 100, tTop: 20, tBot: 30,
      cp1X: 25, cp2X: 75,
    })
    // Bottom edge: C cp2X,tBot  cp1X,sBot  sx,sBot
    expect(pathD).toContain("C75,30 25,10 0,10")
  })

  it("matches Sankey's areaLink formula for the horizontal case", () => {
    // Sankey case: cp1X = xi(curvature=0.5), cp2X = xi(0.5) → midpoint
    // for both control points (the d3-sankey default).
    const sankeyLike = buildRibbonGeometry({
      sx: 0, sTop: -5, sBot: 5,
      tx: 100, tTop: 45, tBot: 55,
      cp1X: 50, cp2X: 50,
    })
    expect(sankeyLike.pathD).toBe(
      "M0,-5 C50,-5 50,45 100,45 L100,55 C50,55 50,5 0,5 Z"
    )
  })

  it("matches ProcessSankey's lane=both formula", () => {
    // ProcessSankey case: cp1X === cp2X === cx (midpoint when lane=both).
    const processLike = buildRibbonGeometry({
      sx: 10, sTop: 20, sBot: 40,
      tx: 200, tTop: 100, tBot: 120,
      cp1X: 105, cp2X: 105,
    })
    expect(processLike.pathD).toBe(
      "M10,20 C105,20 105,100 200,100 L200,120 C105,120 105,40 10,40 Z"
    )
  })

  // ── bezier (centerline cubic) ─────────────────────────────────────────

  it("centerline bezier midpoints between sTop/sBot and tTop/tBot", () => {
    const { bezier } = buildRibbonGeometry({
      sx: 0, sTop: 0, sBot: 10,    // sCenter = 5
      tx: 100, tTop: 20, tBot: 40, // tCenter = 30
      cp1X: 25, cp2X: 75,
    })
    expect(bezier.points).toEqual([
      { x: 0, y: 5 },
      { x: 25, y: 5 },
      { x: 75, y: 30 },
      { x: 100, y: 30 },
    ])
  })

  it("halfWidth is half the source-side band height", () => {
    const { bezier } = buildRibbonGeometry({
      sx: 0, sTop: 0, sBot: 12,
      tx: 100, tTop: 50, tBot: 62,
      cp1X: 50, cp2X: 50,
    })
    expect(bezier.halfWidth).toBe(6)
  })

  it("bezier circular flag is false (this helper handles only the straight case)", () => {
    const { bezier } = buildRibbonGeometry({
      sx: 0, sTop: 0, sBot: 10,
      tx: 100, tTop: 20, tBot: 30,
      cp1X: 50, cp2X: 50,
    })
    expect(bezier.circular).toBe(false)
  })

  // ── round-trip sanity ──────────────────────────────────────────────────

  it("zero-width ribbon produces a degenerate but valid path", () => {
    const { pathD, bezier } = buildRibbonGeometry({
      sx: 0, sTop: 5, sBot: 5,
      tx: 100, tTop: 5, tBot: 5,
      cp1X: 50, cp2X: 50,
    })
    expect(pathD).toBe("M0,5 C50,5 50,5 100,5 L100,5 C50,5 50,5 0,5 Z")
    expect(bezier.halfWidth).toBe(0)
    expect(bezier.points[0]).toEqual({ x: 0, y: 5 })
    expect(bezier.points[3]).toEqual({ x: 100, y: 5 })
  })
})
