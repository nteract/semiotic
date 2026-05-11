import { describe, it, expect } from "vitest"
import { sweepToAngles, valueToAngle, computeArcBoundingBox } from "./radialGeometry"

describe("sweepToAngles", () => {
  it("default 240° sweep produces gauge-style angles", () => {
    const r = sweepToAngles(240)
    expect(r.sweepRad).toBeCloseTo((240 * Math.PI) / 180)
    expect(r.gapDeg).toBe(120)
    expect(r.startAngleDeg).toBe(240) // 180 + 60
    expect(r.startAngleRad).toBeCloseTo((240 * Math.PI) / 180)
  })

  it("180° half-circle sweep — gap at the bottom is 180°", () => {
    const r = sweepToAngles(180)
    expect(r.gapDeg).toBe(180)
    expect(r.startAngleDeg).toBe(270) // 180 + 90
  })

  it("360° full circle — zero gap, start at 6 o'clock", () => {
    const r = sweepToAngles(360)
    expect(r.gapDeg).toBe(0)
    expect(r.startAngleDeg).toBe(180)
  })

  it("offsetRad converts from 12-o'clock-zero to 3-o'clock-zero", () => {
    // For 240° sweep, startAngleDeg = 240. In trig convention (0 at 3
    // o'clock), 12 o'clock is -π/2, so offsetRad = -π/2 + (240π/180).
    const r = sweepToAngles(240)
    const expectedOffset = -Math.PI / 2 + (240 * Math.PI) / 180
    expect(r.offsetRad).toBeCloseTo(expectedOffset)
  })

  it("defaults to 240° sweep when no arg is passed", () => {
    const r = sweepToAngles()
    expect(r.gapDeg).toBe(120)
  })
})

describe("valueToAngle", () => {
  const { sweepRad, offsetRad } = sweepToAngles(240)

  it("maps min to the start of the arc", () => {
    const θ = valueToAngle(0, 0, 100, sweepRad, offsetRad)
    expect(θ).toBeCloseTo(offsetRad)
  })

  it("maps max to the end of the arc", () => {
    const θ = valueToAngle(100, 0, 100, sweepRad, offsetRad)
    expect(θ).toBeCloseTo(offsetRad + sweepRad)
  })

  it("maps the midpoint linearly", () => {
    const θ = valueToAngle(50, 0, 100, sweepRad, offsetRad)
    expect(θ).toBeCloseTo(offsetRad + sweepRad / 2)
  })

  it("clamps values below min", () => {
    const θ = valueToAngle(-50, 0, 100, sweepRad, offsetRad)
    expect(θ).toBeCloseTo(offsetRad)
  })

  it("clamps values above max", () => {
    const θ = valueToAngle(150, 0, 100, sweepRad, offsetRad)
    expect(θ).toBeCloseTo(offsetRad + sweepRad)
  })

  it("handles min === max without dividing by zero", () => {
    const θ = valueToAngle(50, 50, 50, sweepRad, offsetRad)
    // range falls back to 1; value clamps to min, pct=0 → arc start.
    expect(Number.isFinite(θ)).toBe(true)
  })
})

describe("computeArcBoundingBox", () => {
  it("half-circle (180° sweep) → bbox width=2, height=1", () => {
    const bbox = computeArcBoundingBox(180)
    expect(bbox.width).toBeCloseTo(2)
    expect(bbox.height).toBeCloseTo(1)
    expect(bbox.cx).toBeCloseTo(0)
    expect(bbox.cy).toBeCloseTo(-0.5)
  })

  it("full circle (360° sweep) → bbox width=2, height=2", () => {
    const bbox = computeArcBoundingBox(360)
    expect(bbox.width).toBeCloseTo(2)
    expect(bbox.height).toBeCloseTo(2)
  })

  it("240° gauge sweep — symmetric around the y axis", () => {
    const bbox = computeArcBoundingBox(240)
    // 240° sweep starts at 8 o'clock and ends at 4 o'clock — symmetric.
    expect(bbox.cx).toBeCloseTo(0)
    // Width includes the two arc endpoints at ±sin(60°).
    expect(bbox.width).toBeGreaterThan(0)
    // Height includes the top of the arc (0, -1) plus the center.
    expect(bbox.minY).toBeCloseTo(-1)
  })

  it("defaults to 240° sweep when no arg is passed", () => {
    const a = computeArcBoundingBox()
    const b = computeArcBoundingBox(240)
    expect(a.width).toBeCloseTo(b.width)
    expect(a.height).toBeCloseTo(b.height)
  })
})
