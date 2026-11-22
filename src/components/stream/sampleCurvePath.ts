/**
 * Sample a rendered d3 curve for interpolated hover and area hit testing.
 * CanvasHitTester caches the polyline by source path and curve factory.
 */
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
 * A linear path needs no resampling and returns a copy of the input.
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

  const recordPoint = (x: number, y: number) => {
    cursor = [x, y]
    dense.push(cursor)
  }
  const ctx: RecordingContext = {
    moveTo: recordPoint,
    lineTo: recordPoint,
    bezierCurveTo(cx1, cy1, cx2, cy2, x, y) {
      if (!cursor) return recordPoint(x, y)
      const [x0, y0] = cursor
      // Sample the cubic Bezier at uniform t intervals. Skip t=0
      // (already the cursor / previous endpoint) and include t=1 as
      // the new cursor.
      for (let i = 1; i <= samplesPerSegment; i++) {
        const t = i / samplesPerSegment
        const omt = 1 - t
        const start = omt * omt * omt
        const first = 3 * omt * omt * t
        const second = 3 * omt * t * t
        const end = t * t * t
        dense.push([
          start * x0 + first * cx1 + second * cx2 + end * x,
          start * y0 + first * cy1 + second * cy2 + end * y,
        ])
      }
      cursor = [x, y]
    },
    closePath() { /* no-op — line/area builders never close */ },
    arc() { /* d3-shape line/area generators don't emit arcs */ },
    rect() { /* unused */ },
    arcTo() { /* unused */ },
    quadraticCurveTo(_cx, _cy, x, y) {
      // Current d3 line curves use cubics. Keep an endpoint for other curves.
      recordPoint(x, y)
    },
  }

  // This path represents one contiguous line. Feed its vertices directly to
  // the same d3 curve that paints the canvas.
  const curve = curveFactory(ctx as unknown as CanvasRenderingContext2D)
  curve.lineStart()
  for (const [x, y] of points) curve.point(x, y)
  curve.lineEnd()

  return dense
}
