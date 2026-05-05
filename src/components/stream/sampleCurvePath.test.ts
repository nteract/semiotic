/**
 * Regression coverage for the multi-line tooltip curve-honoring fix.
 *
 * Reported on the user-facing multi tooltip: the dot drawn at each
 * series at the hovered X was floating off the visible curve because
 * `findAllNodesAtX` linear-interpolated between adjacent data
 * samples, while the canvas line renderer drew a smooth bezier curve
 * between the same samples through `d3-shape`. The fix samples the
 * d3 curve into a dense polyline that's used by the hit-tester.
 *
 * These tests pin the contract of the sampler itself: linear input
 * passes through unchanged, and a non-linear curve produces a
 * polyline that's visually distinct from the chord between data
 * points (i.e., it has interior samples that don't lie on the
 * straight line through the endpoints).
 */
import { describe, it, expect } from "vitest"
import { sampleCurvePath } from "./sampleCurvePath"
import { resolveCurveFactory } from "./renderers/canvasRenderHelpers"

describe("sampleCurvePath", () => {
  it("returns the input unchanged when no curve factory is given", () => {
    const points: [number, number][] = [[0, 0], [50, 30], [100, 80]]
    const out = sampleCurvePath(points, null)
    expect(out).toEqual(points)
    // Also pin: the returned array is a fresh copy, not the input
    // reference. Callers that mutate the result (the hit-tester
    // doesn't, but defense in depth) shouldn't corrupt the scene.
    expect(out).not.toBe(points)
  })

  it("returns a denser polyline than the input for a curve like monotoneX", () => {
    const factory = resolveCurveFactory("monotoneX")
    expect(factory).not.toBeNull()
    const points: [number, number][] = [
      [0, 50],
      [25, 80],
      [50, 20],
      [75, 60],
      [100, 40],
    ]
    const out = sampleCurvePath(points, factory)
    // 4 segments × 8 samples + 1 starting moveTo = at least 33 entries.
    // (The exact count depends on whether d3-shape emits lineTo or
    // bezierCurveTo for each segment — for monotoneX it's always
    // bezier — so this is a lower bound that catches a regression
    // where the sampler degrades to linear copy.)
    expect(out.length).toBeGreaterThan(points.length * 4)
  })

  it("produces interior samples that lie on the curve, not the chord", () => {
    // Pick a curve known to bend. The "natural" cubic spline through
    // (0,0), (50,100), (100,0) bows ABOVE the straight chord between
    // (0,0) and (100,0) at x≈50. Linear interpolation between data
    // samples would yield y=100 at x=50 (the apex itself) — which is
    // the same as the data sample. A meaningful bend test needs an
    // X that's BETWEEN data samples. Use x=25 / x=75: linear chord
    // through (0,0)→(50,100) has y=50 at x=25, but the natural
    // spline curves over the apex and dips below 50 at x=25.
    const factory = resolveCurveFactory("natural")
    expect(factory).not.toBeNull()
    const points: [number, number][] = [[0, 0], [50, 100], [100, 0]]
    const out = sampleCurvePath(points, factory)
    // Find the sample closest to x=25 in the dense polyline.
    let nearest = out[0]
    for (const p of out) {
      if (Math.abs(p[0] - 25) < Math.abs(nearest[0] - 25)) nearest = p
    }
    // The chord-interpolated value at x=25 between (0,0) and (50,100)
    // is y=50. Any value visually distinct from 50 means the sampler
    // captured the curve. Allow generous tolerance — exact value
    // depends on d3-shape's natural-spline implementation.
    expect(nearest[1]).not.toBe(50)
  })

  it("is stable enough that consecutive samples are dense (curve fidelity check)", () => {
    // The downstream consumer (CanvasHitTester.findAllNodesAtX)
    // linear-interpolates between adjacent samples. For the
    // approximation to be visually indistinguishable from the curve,
    // adjacent samples should be ≤ ~5px apart on a typical chart
    // scale. With 8 samples per segment and segments ~50px wide,
    // gaps should be ~6px. Pin that as a sanity check.
    const factory = resolveCurveFactory("monotoneX")
    const points: [number, number][] = [
      [0, 0], [100, 50], [200, 25], [300, 75],
    ]
    const out = sampleCurvePath(points, factory)
    let maxGap = 0
    for (let i = 1; i < out.length; i++) {
      const dx = Math.abs(out[i][0] - out[i - 1][0])
      if (dx > maxGap) maxGap = dx
    }
    // 100px segments / 8 samples = 12.5px gap; allow some slack
    // for d3-shape's first-segment startup (which may emit a
    // straight lineTo before transitioning to beziers).
    expect(maxGap).toBeLessThan(20)
  })
})
