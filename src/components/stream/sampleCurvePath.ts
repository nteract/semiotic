/**
 * Sample a d3-shape curve into a dense polyline.
 *
 * Why: the canvas line renderer draws curved lines by feeding a
 * `d3.line().curve(curveFactory)` generator straight to the canvas
 * context, which emits cubic-bezier commands. The hit-tester (used by
 * the multi-line tooltip's "show all series at hovered X" path) only
 * has the raw data-sample points — it can't linear-interpolate
 * between sample i and i+1 and expect the result to land on the
 * rendered curve. The dot it draws ends up floating off the line.
 *
 * Fix: re-feed the same data-sample path through the same curve
 * factory, but with a recording context that captures every
 * `lineTo` and `bezierCurveTo` call. Then sample each cubic at
 * `samplesPerSegment` evenly-spaced t values to materialize a dense
 * polyline that, by construction, lies on the visible curve. Linear
 * interpolation between the dense samples is now visually
 * indistinguishable from the curve.
 *
 * Performance: called from the hit-test path only when a non-linear
 * curve is configured. Sampling work is one cubic eval per
 * `samplesPerSegment` per data segment (default 8 samples × ~50
 * segments = ~400 evals per hover-frame per series). At 60 Hz with
 * a few series that's ~100k evals/sec — well under render budget,
 * and consumers can cache the result against the path reference.
 */
import { line as d3Line } from "d3-shape"
import type { CurveFactory } from "d3-shape"

interface RecordingContext {
  // Path commands the contract requires from a `CanvasPathMethods`-like
  // sink. d3-shape's curve generators only call `moveTo`, `lineTo`,
  // `bezierCurveTo`, and (for some closed curves) `closePath`. Anything
  // else is unreachable; we leave them as no-ops to satisfy the type.
  moveTo: (x: number, y: number) => void
  lineTo: (x: number, y: number) => void
  bezierCurveTo: (cx1: number, cy1: number, cx2: number, cy2: number, x: number, y: number) => void
  closePath: () => void
  arc: (...args: unknown[]) => void
  rect: (...args: unknown[]) => void
  arcTo: (...args: unknown[]) => void
  quadraticCurveTo: (cx: number, cy: number, x: number, y: number) => void
}

/**
 * Sample a d3-shape curve through `points` into a dense polyline.
 *
 * Returns the same `points` array unchanged when `curveFactory` is
 * null — caller should treat that as the linear case (no resampling
 * needed).
 */
export function sampleCurvePath(
  points: ReadonlyArray<readonly [number, number]>,
  curveFactory: CurveFactory | null,
  samplesPerSegment: number = 8,
): [number, number][] {
  if (!curveFactory || points.length < 2) {
    return points.map(([x, y]) => [x, y])
  }

  // Walk d3-shape's emitted path. A typical curve over N points
  // emits 1 `moveTo` followed by N-1 mixed lineTo / bezierCurveTo
  // commands, plus an optional closing for the closed variants.
  const dense: [number, number][] = []
  let cursor: [number, number] | null = null

  const ctx: RecordingContext = {
    moveTo(x, y) {
      cursor = [x, y]
      dense.push([x, y])
    },
    lineTo(x, y) {
      cursor = [x, y]
      dense.push([x, y])
    },
    bezierCurveTo(cx1, cy1, cx2, cy2, x, y) {
      if (!cursor) {
        cursor = [x, y]
        dense.push([x, y])
        return
      }
      const [x0, y0] = cursor
      // Sample the cubic Bezier at uniform t intervals. Skip t=0
      // (already the cursor / previous endpoint) and include t=1 as
      // the new cursor.
      for (let i = 1; i <= samplesPerSegment; i++) {
        const t = i / samplesPerSegment
        const omt = 1 - t
        const sx = omt * omt * omt * x0
          + 3 * omt * omt * t * cx1
          + 3 * omt * t * t * cx2
          + t * t * t * x
        const sy = omt * omt * omt * y0
          + 3 * omt * omt * t * cy1
          + 3 * omt * t * t * cy2
          + t * t * t * y
        dense.push([sx, sy])
      }
      cursor = [x, y]
    },
    closePath() { /* no-op — line/area builders never close */ },
    arc() { /* d3-shape line/area generators don't emit arcs */ },
    rect() { /* unused */ },
    arcTo() { /* unused */ },
    quadraticCurveTo(_cx, _cy, x, y) {
      // Quadratic isn't emitted by any current d3-shape line curve,
      // but stub it defensively so a future d3 minor-version that
      // adds one doesn't crash hover. Convert to a cubic-equivalent
      // sample (degree-elevated): for a hit-test polyline the
      // additional precision is over-engineering; just lineTo.
      cursor = [x, y]
      dense.push([x, y])
    },
  }

  // d3-line's curve(factory) needs an iterable; we feed the points
  // directly. The generator lives only for this call.
  // Cast through `unknown` to satisfy d3-shape's full
  // `CanvasRenderingContext2D` parameter type — the curve generators
  // only call the `CanvasPathMethods` subset (moveTo, lineTo,
  // bezierCurveTo, closePath), so the recording context shape is
  // sufficient at runtime even if the type system can't see it.
  d3Line<readonly [number, number]>()
    .x((p) => p[0])
    .y((p) => p[1])
    .curve(curveFactory)
    .context(ctx as unknown as CanvasRenderingContext2D)(points)

  return dense
}
