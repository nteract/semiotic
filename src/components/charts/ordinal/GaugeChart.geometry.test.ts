/**
 * TDD: Verify gauge geometry — gap must be centered at 6 o'clock (bottom).
 *
 * Semiotic's pieScene coordinate system:
 *   startAngleOffset = -π/2 + (startAngle_degrees * π / 180)
 *   First wedge starts at startAngleOffset
 *   Wedges proceed clockwise by pct * 2π
 *
 * Standard positions (in radians from Semiotic's 0 = 3 o'clock):
 *   12 o'clock = -π/2
 *   3 o'clock  = 0
 *   6 o'clock  = π/2
 *   9 o'clock  = -π (or π)
 */
import { describe, it, expect } from "vitest"

// Replicate pieScene's angle calculation
function pieSceneStartAngle(startAngleDeg: number): number {
  return -Math.PI / 2 + (startAngleDeg * Math.PI) / 180
}

// For a gauge: the arc covers `sweep` degrees, gap covers `360 - sweep` degrees.
// Gap must be centered at 6 o'clock (π/2 radians in Semiotic frame).
// Arc starts at the END of the gap (going clockwise from gap center + gapHalf).

describe("Gauge geometry: gap centered at 6 o'clock", () => {

  it("180° sweep should be a top-half sunrise (arc from 9 o'clock to 3 o'clock)", () => {
    const sweep = 180
    // For sunrise: arc starts at 9 o'clock (-π) and ends at 3 o'clock (0)
    // The gap (180°) is centered at bottom (π/2), spanning from 3 o'clock to 9 o'clock.
    // Arc start = 9 o'clock = -π in Semiotic frame = π radians in standard

    // What startAngleDeg makes pieScene start at 9 o'clock?
    // pieSceneStartAngle(X) = -π
    // -π/2 + X*π/180 = -π
    // X*π/180 = -π + π/2 = -π/2
    // X = -90
    const startAngleDeg = -90
    const startRad = pieSceneStartAngle(startAngleDeg)
    expect(startRad).toBeCloseTo(-Math.PI, 4) // 9 o'clock

    // Arc end = start + sweep fraction of 2π
    // But we add a gap segment, so sweep fraction = 180/360 = 0.5
    const sweepFraction = sweep / 360
    const arcEndRad = startRad + sweepFraction * 2 * Math.PI
    expect(arcEndRad).toBeCloseTo(0, 4) // 3 o'clock ✓

    // Gap starts at 3 o'clock (0) and ends at 9 o'clock (-π/π)
    // Gap center = π/2 (6 o'clock) ✓
  })

  it("240° sweep should have gap centered at bottom", () => {
    const sweep = 240
    const gapDeg = 360 - sweep // 120°
    const gapHalfRad = (gapDeg / 2) * Math.PI / 180 // 60° = π/3

    // Gap center = 6 o'clock = π/2 in Semiotic frame
    // Gap runs from π/2 - π/3 to π/2 + π/3 = π/6 to 5π/6
    // Arc starts where gap ends = 5π/6 (about 7:30 on clock)
    const arcStartRad = Math.PI / 2 + gapHalfRad // 5π/6
    expect(arcStartRad).toBeCloseTo(5 * Math.PI / 6, 4)

    // What startAngleDeg produces this?
    // -π/2 + X*π/180 = 5π/6
    // X*π/180 = 5π/6 + π/2 = 5π/6 + 3π/6 = 8π/6 = 4π/3
    // X = 4π/3 * 180/π = 240
    const startAngleDeg = 240
    expect(pieSceneStartAngle(startAngleDeg)).toBeCloseTo(arcStartRad, 4)
  })

  it("360° sweep (full circle) should start at 12 o'clock", () => {
    // No gap, start at 12 o'clock
    // pieSceneStartAngle(0) = -π/2 = 12 o'clock
    const startAngleDeg = 0
    expect(pieSceneStartAngle(startAngleDeg)).toBeCloseTo(-Math.PI / 2, 4)
  })

  it("general formula: startAngleDeg = 90 + sweep/2 centers gap at bottom", () => {
    // Testing the formula: startAngleDeg = 90 + sweep/2
    // For 180°: 90 + 90 = 180 → pieSceneStartAngle(180) = -π/2 + π = π/2 (6 o'clock) — WRONG, that's the gap center not arc start

    // Correct formula derivation:
    // Gap center at π/2 (6 o'clock). Gap half = (360-sweep)/2 degrees.
    // Arc starts at gap end = π/2 + gapHalf_radians
    // In pieScene: -π/2 + X*π/180 = π/2 + ((360-sweep)/2)*π/180
    // X*π/180 = π/2 + π/2 + ((360-sweep)/2)*π/180 - ... wait let me just solve:
    // X = (π/2 + (360-sweep)/2 * π/180) * 180/π + 90
    // X = 90 + (360-sweep)/2 + 90
    // X = 180 + (360-sweep)/2

    // Actually cleaner: X = 180 + gapDeg/2 where gapDeg = 360 - sweep... but that gave wrong results.
    // Let me verify with the 180° case:
    // sweep=180, gapDeg=180, X = 180 + 90 = 270
    // pieSceneStartAngle(270) = -π/2 + 270*π/180 = -π/2 + 3π/2 = π
    // π = -π (same angle, 9 o'clock) ✓ — but for 240°:
    // sweep=240, gapDeg=120, X = 180 + 60 = 240
    // pieSceneStartAngle(240) = -π/2 + 240*π/180 = -π/2 + 4π/3 = -3π/6 + 8π/6 = 5π/6
    // 5π/6 ≈ 150° from 3 o'clock ≈ 7:30 position ✓

    // So formula is: startAngleDeg = 180 + (360 - sweep) / 2

    for (const sweep of [180, 240, 270, 300, 360]) {
      const gapDeg = 360 - sweep
      const gapHalfRad = (gapDeg / 2) * Math.PI / 180
      const expectedArcStart = Math.PI / 2 + gapHalfRad

      const startAngleDeg = 180 + gapDeg / 2
      const actual = pieSceneStartAngle(startAngleDeg)

      // Normalize both to [0, 2π) for comparison
      const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      expect(norm(actual)).toBeCloseTo(norm(expectedArcStart), 3)
    }
  })
})
